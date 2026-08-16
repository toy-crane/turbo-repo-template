import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { Platform } from "./options";

export const STATE_VERSION = 1;

export interface ProcessRecord {
  logPath: string;
  pid: number;
  port: number;
}

export type ProcessKind = "api" | "metro";

export interface WorktreeRecord {
  /** Platforms whose app is currently attached to this worktree's Metro. */
  activePlatforms: Platform[];
  devices: Partial<Record<Platform, string>>;
  environmentFingerprint: string | null;
  label: string;
  processes: Partial<Record<ProcessKind, ProcessRecord>>;
  slot: number;
}

export interface DeviceRecord {
  installedFingerprint: string | null;
  leasedTo: string | null;
}

export interface RepositoryState {
  devicePool: Record<Platform, Record<string, DeviceRecord>>;
  version: number;
  worktrees: Record<string, WorktreeRecord>;
}

export function createEmptyState(): RepositoryState {
  return {
    devicePool: { android: {}, ios: {} },
    version: STATE_VERSION,
    worktrees: {},
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseProcess(value: unknown): ProcessRecord | undefined {
  const raw = asRecord(value);

  if (
    typeof raw.pid !== "number" ||
    typeof raw.port !== "number" ||
    typeof raw.logPath !== "string"
  ) {
    return;
  }

  return { logPath: raw.logPath, pid: raw.pid, port: raw.port };
}

function isPlatform(value: unknown): value is Platform {
  return value === "ios" || value === "android";
}

/**
 * Anything unreadable becomes an empty list rather than a guess. A worktree
 * that then looks like it has no attached app only loses the app relaunch;
 * its slot, devices and installed builds are untouched.
 */
function parsePlatforms(value: unknown): Platform[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter(isPlatform))];
}

function parseWorktree(value: unknown): WorktreeRecord | undefined {
  const raw = asRecord(value);

  if (typeof raw.slot !== "number" || !Number.isInteger(raw.slot)) {
    return;
  }

  const devices = asRecord(raw.devices);
  const processes = asRecord(raw.processes);
  const api = parseProcess(processes.api);
  const metro = parseProcess(processes.metro);

  return {
    activePlatforms: parsePlatforms(raw.activePlatforms),
    devices: {
      ...(typeof devices.android === "string"
        ? { android: devices.android }
        : {}),
      ...(typeof devices.ios === "string" ? { ios: devices.ios } : {}),
    },
    environmentFingerprint:
      typeof raw.environmentFingerprint === "string"
        ? raw.environmentFingerprint
        : null,
    label: typeof raw.label === "string" ? raw.label : "",
    processes: { ...(api ? { api } : {}), ...(metro ? { metro } : {}) },
    slot: raw.slot,
  };
}

function parsePool(value: unknown): Record<string, DeviceRecord> {
  const pool: Record<string, DeviceRecord> = {};

  for (const [id, entry] of Object.entries(asRecord(value))) {
    const raw = asRecord(entry);

    pool[id] = {
      installedFingerprint:
        typeof raw.installedFingerprint === "string"
          ? raw.installedFingerprint
          : null,
      leasedTo: typeof raw.leasedTo === "string" ? raw.leasedTo : null,
    };
  }

  return pool;
}

/**
 * A hand-edited or half-written file must not take the session down with it:
 * anything unreadable starts over as an empty state, and reconciliation then
 * puts the real worktrees and devices back.
 */
export function parseState(input: unknown): RepositoryState {
  const raw = asRecord(input);

  if (raw.version !== STATE_VERSION) {
    return createEmptyState();
  }

  const pool = asRecord(raw.devicePool);
  const worktrees: Record<string, WorktreeRecord> = {};

  for (const [path, entry] of Object.entries(asRecord(raw.worktrees))) {
    const worktree = parseWorktree(entry);

    if (worktree) {
      worktrees[path] = worktree;
    }
  }

  return {
    devicePool: {
      android: parsePool(pool.android),
      ios: parsePool(pool.ios),
    },
    version: STATE_VERSION,
    worktrees,
  };
}

export function readState(statePath: string): RepositoryState {
  try {
    return parseState(JSON.parse(readFileSync(statePath, "utf8")));
  } catch {
    return createEmptyState();
  }
}

/**
 * Write to a sibling file and rename. A reader that opens the state while a
 * second worktree is starting sees either the old file or the new one, never
 * the half of a record that made it to disk first.
 */
export function writeState(statePath: string, state: RepositoryState): void {
  const directory = dirname(statePath);

  mkdirSync(directory, { recursive: true });

  const temporaryPath = join(
    directory,
    `.state.${process.pid}.${Date.now()}.json`
  );

  writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(temporaryPath, statePath);
}
