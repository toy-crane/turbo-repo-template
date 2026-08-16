import type { Platform } from "../options";
import type { WorktreeRecord } from "../state";

export type SessionReuseReason =
  | "environment-changed"
  | "metro-inputs-changed"
  | "not-running"
  | "reuse";

/**
 * Which platform the command asked for does not enter this decision. The
 * session's addresses are the same on both platforms, so a running API and
 * Metro serve a newly added platform exactly as they serve the current one.
 */
export function sessionReuseReason(
  record: WorktreeRecord | undefined,
  environmentFingerprint: string,
  metroInputsCurrent: boolean
): SessionReuseReason {
  if (!record) {
    return "not-running";
  }

  // Half a session cannot serve anything, so it is not reusable either.
  if (!(record.processes.api && record.processes.metro)) {
    return "not-running";
  }

  if (!metroInputsCurrent) {
    return "metro-inputs-changed";
  }

  return record.environmentFingerprint === environmentFingerprint
    ? "reuse"
    : "environment-changed";
}

export type StartPlan = "join" | "relaunch" | "restart";

export interface StartPlanInput {
  /** Platforms attached before this command ran. */
  attached: readonly Platform[];
  platform: Platform;
  /** This worktree's API and Metro are alive and reusable. */
  running: boolean;
}

/**
 * Starting a platform never takes another one down. A platform that is already
 * attached only reopens its app, a new platform joins the running processes
 * after its own build, and a session that has to restart brings back every
 * platform that was attached before it.
 */
export function startPlan({
  attached,
  platform,
  running,
}: StartPlanInput): StartPlan {
  if (!running) {
    return "restart";
  }

  return attached.includes(platform) ? "relaunch" : "join";
}

/** The platforms attached once this run finishes, in the order they attached. */
export function platformsAfterStart(
  plan: StartPlan,
  attached: readonly Platform[],
  platform: Platform,
  reattached: readonly Platform[] = []
): Platform[] {
  if (plan === "relaunch") {
    return [...attached];
  }

  if (plan === "join") {
    return [...attached, platform];
  }

  return [platform, ...reattached];
}
