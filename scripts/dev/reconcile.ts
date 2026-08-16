import type { Platform } from "./options";
import type {
  ProcessKind,
  ProcessRecord,
  RepositoryState,
  WorktreeRecord,
} from "./state";

const PLATFORMS: Platform[] = ["android", "ios"];

export interface ReleasedDevice {
  deviceId: string;
  platform: Platform;
}

export interface ReclaimedWorktree {
  processes: ProcessRecord[];
  worktreePath: string;
}

export interface StrandedSession {
  processes: ProcessRecord[];
  worktreePath: string;
}

export interface ReconcileFacts {
  /**
   * Enumerated device ids per platform. A platform left out is simply not
   * checked, so `bun run dev ios` never prunes Android state it could not read.
   */
  existingDeviceIds: Partial<Record<Platform, ReadonlySet<string>>>;
  /** True only when the recorded pid still runs *and* belongs to this worktree. */
  isSessionProcessLive: (
    worktreePath: string,
    kind: ProcessKind,
    record: ProcessRecord
  ) => boolean;
  liveWorktrees: ReadonlySet<string>;
}

export interface ReconcileResult {
  next: RepositoryState;
  /** Worktrees that left the repository. Their logs and slots are gone too. */
  reclaimed: ReclaimedWorktree[];
  /** Devices to shut down and erase before they go back into the pool. */
  releasedDevices: ReleasedDevice[];
  /** Live worktrees whose session half-died; the survivors must be stopped. */
  stranded: StrandedSession[];
}

function liveProcesses(
  worktreePath: string,
  record: WorktreeRecord,
  facts: ReconcileFacts
): ProcessRecord[] {
  return processEntries(record)
    .filter(([kind, entry]) =>
      facts.isSessionProcessLive(worktreePath, kind, entry)
    )
    .map(([, entry]) => entry);
}

function processEntries(
  record: WorktreeRecord
): [ProcessKind, ProcessRecord][] {
  const entries: [ProcessKind, ProcessRecord][] = [];

  if (record.processes.api) {
    entries.push(["api", record.processes.api]);
  }

  if (record.processes.metro) {
    entries.push(["metro", record.processes.metro]);
  }

  return entries;
}

function pruneMissingDevices(
  state: RepositoryState,
  facts: ReconcileFacts
): void {
  for (const platform of PLATFORMS) {
    const known = facts.existingDeviceIds[platform];

    if (!known) {
      continue;
    }

    for (const deviceId of Object.keys(state.devicePool[platform])) {
      if (known.has(deviceId)) {
        continue;
      }

      delete state.devicePool[platform][deviceId];

      for (const record of Object.values(state.worktrees)) {
        if (record.devices[platform] === deviceId) {
          delete record.devices[platform];
          // The app went with the device, so the platform is no longer
          // attached either. Left in, it would be reported as running and
          // looked for on the next stop.
          record.activePlatforms = record.activePlatforms.filter(
            (entry) => entry !== platform
          );
        }
      }
    }
  }
}

function releaseWorktreeDevices(
  state: RepositoryState,
  record: WorktreeRecord,
  released: ReleasedDevice[]
): void {
  for (const platform of PLATFORMS) {
    const deviceId = record.devices[platform];

    if (!deviceId) {
      continue;
    }

    const device = state.devicePool[platform][deviceId];

    if (device) {
      // The fingerprint is cleared with the lease on purpose: the next
      // worktree gets an erased device, so nothing is installed on it yet.
      device.installedFingerprint = null;
      device.leasedTo = null;
    }

    released.push({ deviceId, platform });
  }
}

function releaseDanglingLeases(
  state: RepositoryState,
  released: ReleasedDevice[]
): void {
  for (const platform of PLATFORMS) {
    for (const [deviceId, device] of Object.entries(
      state.devicePool[platform]
    )) {
      const holder = device.leasedTo;

      if (!holder) {
        continue;
      }

      if (state.worktrees[holder]?.devices[platform] === deviceId) {
        continue;
      }

      device.installedFingerprint = null;
      device.leasedTo = null;
      released.push({ deviceId, platform });
    }
  }
}

/**
 * Every start command runs this before it hands out anything new. A worktree
 * that left the repository gives its devices and slot back; one that is still
 * checked out keeps them even when its processes died, so the app data and the
 * signed-in session survive an ordinary stop.
 */
export function reconcile(
  state: RepositoryState,
  facts: ReconcileFacts
): ReconcileResult {
  const next: RepositoryState = structuredClone(state);
  const reclaimed: ReclaimedWorktree[] = [];
  const releasedDevices: ReleasedDevice[] = [];
  const stranded: StrandedSession[] = [];

  // Devices the machine no longer has go first, so nothing downstream tries to
  // shut down or erase a simulator that was deleted outside this tool.
  pruneMissingDevices(next, facts);

  for (const [worktreePath, record] of Object.entries(next.worktrees)) {
    if (!facts.liveWorktrees.has(worktreePath)) {
      reclaimed.push({
        processes: liveProcesses(worktreePath, record, facts),
        worktreePath,
      });
      releaseWorktreeDevices(next, record, releasedDevices);
      delete next.worktrees[worktreePath];
      continue;
    }

    const entries = processEntries(record);
    const alive = liveProcesses(worktreePath, record, facts);

    if (entries.length === 0 || alive.length === entries.length) {
      continue;
    }

    // Half a session is not a session. The survivor is stopped so the next
    // start owns both processes, while the slot, the device and everything
    // installed on it stay exactly where they were.
    stranded.push({ processes: alive, worktreePath });
    record.activePlatforms = [];
    record.environmentFingerprint = null;
    record.processes = {};
  }

  releaseDanglingLeases(next, releasedDevices);

  return { next, reclaimed, releasedDevices, stranded };
}
