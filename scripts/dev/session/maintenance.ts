import { rmSync } from "node:fs";

import { listWorktrees } from "../adapters/git";
import { isOwnedByWorktree, stopProcess } from "../adapters/processes";
import type { Platform } from "../options";
import { worktreeLogDirectory } from "../paths";
import { type ReleasedDevice, reconcile } from "../reconcile";
import type { ProcessKind, ProcessRecord, RepositoryState } from "../state";
import type { SessionContext, SessionIo } from "./context";
import { driverFor } from "./platform";

const PROCESS_KINDS: ProcessKind[] = ["api", "metro"];

export function processKey(
  worktreePath: string,
  kind: ProcessKind,
  record: ProcessRecord
): string {
  return `${worktreePath}::${kind}::${record.pid}`;
}

/**
 * Ownership needs `ps` and `lsof`, so the answers are collected before the
 * pure reconciliation, which then only reads them. `dev:status` reads the same
 * answers so it agrees with what the next start would reclaim.
 */
export async function liveProcessKeys(
  state: RepositoryState
): Promise<Set<string>> {
  const checks: Promise<string | undefined>[] = [];

  for (const [worktreePath, record] of Object.entries(state.worktrees)) {
    for (const kind of PROCESS_KINDS) {
      const entry = record.processes[kind];

      if (entry) {
        checks.push(
          isOwnedByWorktree(entry.pid, worktreePath).then((owned) =>
            owned ? processKey(worktreePath, kind, entry) : undefined
          )
        );
      }
    }
  }

  return new Set(
    (await Promise.all(checks)).filter((key) => key !== undefined)
  );
}

async function enumerateDevices(
  context: SessionContext
): Promise<Partial<Record<Platform, ReadonlySet<string>>>> {
  const platforms: Platform[] = ["android", "ios"];
  const found: Partial<Record<Platform, ReadonlySet<string>>> = {};

  await Promise.all(
    platforms.map(async (platform) => {
      const driver = driverFor(context, platform);

      try {
        found[platform] = await driver.existingDeviceIds();
      } catch {
        // A platform whose tools are missing keeps its recorded assignment:
        // the devices may well come back with the tooling.
      }
    })
  );

  return found;
}

async function eraseReleased(
  context: SessionContext,
  released: ReleasedDevice[],
  io: SessionIo
): Promise<void> {
  for (const { deviceId, platform } of released) {
    const driver = driverFor(context, platform);

    try {
      // biome-ignore lint/performance/noAwaitInLoops: erasing devices in parallel makes the tools contend for the same daemons.
      await driver.eraseToPool(deviceId);
      io.log(`  기기를 초기화해 풀로 돌려놓았습니다: ${platform} ${deviceId}`);
    } catch (error) {
      io.log(
        `  기기를 초기화하지 못했습니다: ${platform} ${deviceId} (${error instanceof Error ? error.message : String(error)})`
      );
    }
  }
}

/**
 * Runs before any command hands out a slot or a device. Worktrees that left
 * the repository give everything back; the ones still checked out keep their
 * device, their installed app and the session signed in on it.
 */
export async function fitStateToReality(
  context: SessionContext,
  state: RepositoryState,
  io: SessionIo
): Promise<RepositoryState> {
  const [worktrees, livePids, existingDeviceIds] = await Promise.all([
    listWorktrees(context.git.worktreePath),
    liveProcessKeys(state),
    enumerateDevices(context),
  ]);

  const result = reconcile(state, {
    existingDeviceIds,
    isSessionProcessLive: (worktreePath, kind, record) =>
      livePids.has(processKey(worktreePath, kind, record)),
    liveWorktrees: new Set(worktrees),
  });

  for (const entry of [...result.reclaimed, ...result.stranded]) {
    for (const record of entry.processes) {
      // biome-ignore lint/performance/noAwaitInLoops: each stop waits out its own grace period.
      await stopProcess(record.pid);
    }
  }

  for (const entry of result.reclaimed) {
    io.log(`사라진 worktree의 자원을 정리했습니다: ${entry.worktreePath}`);
    rmSync(worktreeLogDirectory(context.paths, entry.worktreePath), {
      force: true,
      recursive: true,
    });
  }

  await eraseReleased(context, result.releasedDevices, io);

  return result.next;
}

/** Stops this worktree's own processes without touching anyone else's. */
export async function stopOwnProcesses(
  worktreePath: string,
  state: RepositoryState
): Promise<void> {
  const record = state.worktrees[worktreePath];

  if (!record) {
    return;
  }

  for (const kind of PROCESS_KINDS) {
    const entry = record.processes[kind];

    if (!entry) {
      continue;
    }

    // biome-ignore lint/performance/noAwaitInLoops: ownership is confirmed per process before it is stopped.
    if (await isOwnedByWorktree(entry.pid, worktreePath)) {
      await stopProcess(entry.pid);
    }
  }

  record.processes = {};
  record.activePlatforms = [];
  record.environmentFingerprint = null;
}
