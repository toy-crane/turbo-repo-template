import type { Platform } from "../options";
import type { WorktreeRecord } from "../state";

export type SessionReuseReason =
  | "environment-changed"
  | "metro-inputs-changed"
  | "not-running"
  | "reuse";

export function sessionReuseReason(
  record: WorktreeRecord | undefined,
  platform: Platform,
  environmentFingerprint: string,
  metroInputsCurrent: boolean
): SessionReuseReason {
  const isRunning =
    record?.activePlatform === platform &&
    Boolean(record.processes.api) &&
    Boolean(record.processes.metro);

  if (!isRunning) {
    return "not-running";
  }

  if (!metroInputsCurrent) {
    return "metro-inputs-changed";
  }

  return record.environmentFingerprint === environmentFingerprint
    ? "reuse"
    : "environment-changed";
}
