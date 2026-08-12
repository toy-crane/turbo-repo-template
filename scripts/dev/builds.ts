export type BuildPlan =
  /** The device already runs this exact fingerprint. */
  | { action: "keep" }
  /** The repository already built this fingerprint; install that artifact. */
  | { action: "install"; artifactPath: string }
  /** Nobody has built this fingerprint yet. */
  | { action: "build" };

export interface PlanBuildInput {
  /** Path of the stored shared artifact, when the repository has one. */
  artifactPath: string | undefined;
  fingerprint: string;
  /** What the assigned device carries right now. */
  installedFingerprint: string | null;
}

/**
 * The order the spec fixes: reuse what is on the device, otherwise install the
 * repository's shared artifact, and build only when neither exists. A
 * JavaScript-only change keeps the fingerprint, so it stops at the first step.
 */
export function planBuild({
  artifactPath,
  fingerprint,
  installedFingerprint,
}: PlanBuildInput): BuildPlan {
  if (installedFingerprint === fingerprint) {
    return { action: "keep" };
  }

  if (artifactPath) {
    return { action: "install", artifactPath };
  }

  return { action: "build" };
}
