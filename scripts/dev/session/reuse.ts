import type { Platform } from "../options";
import type { WorktreeRecord } from "../state";

export type SessionReuseReason =
  | "environment-changed"
  | "not-running"
  | "reuse";

export function sessionReuseReason(
  record: WorktreeRecord | undefined,
  platform: Platform,
  environmentFingerprint: string
): SessionReuseReason {
  const isRunning =
    record?.activePlatform === platform &&
    Boolean(record.processes.api) &&
    Boolean(record.processes.metro);

  if (!isRunning) {
    return "not-running";
  }

  return record.environmentFingerprint === environmentFingerprint
    ? "reuse"
    : "environment-changed";
}
