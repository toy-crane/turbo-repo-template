import { existsSync } from "node:fs";

import {
  listAvds,
  listRunningAvds,
  resolveAndroidSdk,
} from "../adapters/android";
import { listSimulators } from "../adapters/ios";
import { isOwnedByWorktree } from "../adapters/processes";
import type { Platform } from "../options";
import { type RepositoryState, readState } from "../state";
import {
  buildStatusReport,
  renderStatusReport,
  type StatusFacts,
  type StatusReport,
} from "../status";
import { createSessionContext, type SessionIo } from "./context";

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

/** Missing Android tooling degrades the display the same way. */
async function collectAndroidFacts(): Promise<AndroidFacts> {
  try {
    const sdk = resolveAndroidSdk();
    const [avds, serials] = await Promise.all([
      listAvds(sdk),
      listRunningAvds(sdk),
    ]);

    return { existing: new Set(avds), serials };
  } catch {
    return { existing: undefined, serials: new Map() };
  }
}

/**
 * Read-only by design: the state file is read as it is, and dead processes or
 * missing devices are reported rather than repaired. Reclaiming stays with the
 * start commands, so this is safe to run at any moment.
 */
async function collectLiveProcessKeys(
  state: RepositoryState
): Promise<Set<string>> {
  const checks: Promise<string | undefined>[] = [];

  for (const [worktreePath, record] of Object.entries(state.worktrees)) {
    for (const [kind, entry] of Object.entries(record.processes)) {
      checks.push(
        isOwnedByWorktree(entry.pid, worktreePath).then((owned) =>
          owned ? `${worktreePath}::${kind}::${entry.pid}` : undefined
        )
      );
    }
  }

  return new Set(
    (await Promise.all(checks)).filter((key) => key !== undefined)
  );
}

export async function showStatus({
  cwd,
  io,
}: StatusInput): Promise<StatusReport> {
  const context = await createSessionContext(cwd);
  const state = readState(context.paths.statePath);
  const [ios, android, livePids] = await Promise.all([
    collectIosFacts(),
    collectAndroidFacts(),
    collectLiveProcessKeys(state),
  ]);

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
      livePids.has(`${worktreePath}::${kind}::${record.pid}`),
    worktreeExists: (path) => existsSync(path),
  };
  const report = buildStatusReport(state, facts);

  for (const line of renderStatusReport(report)) {
    io.log(line);
  }

  return report;
}
