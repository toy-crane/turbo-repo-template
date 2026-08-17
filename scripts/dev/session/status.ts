import {
  listAvds,
  listRunningAvds,
  resolveAndroidSdk,
} from "../adapters/android";
import { listWorktrees } from "../adapters/git";
import { listSimulators } from "../adapters/ios";
import type { Platform } from "../options";
import { readState } from "../state";
import {
  buildStatusReport,
  renderStatusReport,
  type StatusFacts,
  type StatusReport,
} from "../status-report";
import { createSessionContext, type SessionIo } from "./context";
import { liveProcessKeys, processKey } from "./maintenance";

export interface StatusInput {
  cwd: string;
  io: SessionIo;
}

interface IosFacts {
  booted: Set<string>;
  existing: Set<string> | undefined;
  names: Map<string, string> | undefined;
}

/** Missing Xcode degrades the display instead of failing the command. */
async function collectIosFacts(): Promise<IosFacts> {
  try {
    const simulators = await listSimulators();

    return {
      booted: new Set(
        simulators.filter((device) => device.booted).map((entry) => entry.udid)
      ),
      existing: new Set(simulators.map((entry) => entry.udid)),
      names: new Map(simulators.map((entry) => [entry.udid, entry.name])),
    };
  } catch {
    return { booted: new Set(), existing: undefined, names: undefined };
  }
}

interface AndroidFacts {
  existing: Set<string> | undefined;
  serials: Map<string, string>;
}

/**
 * Missing Android tooling degrades the display the same way. The two probes
 * fail independently: adb can be present without the emulator binary, and a
 * running emulator must still show as running then.
 */
async function collectAndroidFacts(): Promise<AndroidFacts> {
  const sdk = resolveAndroidSdk();
  const [existing, serials] = await Promise.all([
    listAvds(sdk).then(
      (avds) => new Set(avds),
      () => undefined
    ),
    listRunningAvds(sdk).catch(() => new Map<string, string>()),
  ]);

  return { existing, serials };
}

/**
 * Read-only by design: the state file is read as it is, and dead processes or
 * missing devices are reported rather than repaired. The facts come from the
 * same probes reconciliation uses, so what this shows as gone or dead is what
 * the next start command will act on.
 */
export async function showStatus({
  cwd,
  io,
}: StatusInput): Promise<StatusReport> {
  const context = await createSessionContext(cwd);
  const state = readState(context.paths.statePath);
  const [ios, android, livePids, worktrees] = await Promise.all([
    collectIosFacts(),
    collectAndroidFacts(),
    liveProcessKeys(state),
    listWorktrees(context.git.worktreePath),
  ]);
  const liveWorktrees = new Set(worktrees);

  const existingDeviceIds: Partial<Record<Platform, ReadonlySet<string>>> = {};

  if (ios.existing) {
    existingDeviceIds.ios = ios.existing;
  }

  if (android.existing) {
    existingDeviceIds.android = android.existing;
  }

  const facts: StatusFacts = {
    androidSerials: android.serials,
    bootedIos: ios.booted,
    existingDeviceIds,
    iosNames: ios.names,
    isProcessAlive: (worktreePath, kind, record) =>
      livePids.has(processKey(worktreePath, kind, record)),
    worktreeExists: (path) => liveWorktrees.has(path),
  };
  const report = buildStatusReport(state, facts);

  for (const line of renderStatusReport(report)) {
    io.log(line);
  }

  return report;
}
