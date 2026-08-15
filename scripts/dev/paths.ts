import { createHash } from "node:crypto";
import { homedir, platform as osPlatform } from "node:os";
import { basename, dirname, join } from "node:path";

import type { Platform } from "./options";

const CACHE_NAMESPACE = "expo-dev-sessions";
const KEY_HASH_LENGTH = 12;

/**
 * The state never belongs in the checkout: it describes processes and devices
 * of the whole machine, and a worktree is exactly the thing that comes and
 * goes underneath it.
 */
export function userCacheRoot(
  env: Record<string, string | undefined> = process.env,
  home: string = homedir()
): string {
  const xdg = env.XDG_CACHE_HOME?.trim();

  if (xdg) {
    return xdg;
  }

  return osPlatform() === "darwin"
    ? join(home, "Library", "Caches")
    : join(home, ".cache");
}

/**
 * Two checkouts of the same repository share this key, and two unrelated
 * repositories that happen to share a folder name do not. The readable prefix
 * only exists so a human can tell the folders apart.
 */
export function repositoryKey(gitCommonDirectory: string): string {
  const digest = createHash("sha1")
    .update(gitCommonDirectory)
    .digest("hex")
    .slice(0, KEY_HASH_LENGTH);
  const name = basename(dirname(gitCommonDirectory)) || "repository";

  return `${name}-${digest}`;
}

export function worktreeKey(worktreePath: string): string {
  const digest = createHash("sha1")
    .update(worktreePath)
    .digest("hex")
    .slice(0, KEY_HASH_LENGTH);
  const name = basename(worktreePath) || "worktree";

  return `${name}-${digest}`;
}

export interface RepositoryPaths {
  buildRoot: string;
  lockDirectory: string;
  root: string;
  statePath: string;
  worktreeRoot: string;
}

export function repositoryPaths(
  gitCommonDirectory: string,
  cacheRoot: string = userCacheRoot()
): RepositoryPaths {
  const root = join(
    cacheRoot,
    CACHE_NAMESPACE,
    repositoryKey(gitCommonDirectory)
  );

  return {
    buildRoot: join(root, "builds"),
    lockDirectory: join(root, "state.lock"),
    root,
    statePath: join(root, "state.json"),
    worktreeRoot: join(root, "worktrees"),
  };
}

export function worktreeLogDirectory(
  paths: RepositoryPaths,
  worktreePath: string
): string {
  return join(paths.worktreeRoot, worktreeKey(worktreePath));
}

/** Gradle state is path-sensitive, so Android builds never share this home. */
export function worktreeGradleHome(
  paths: RepositoryPaths,
  worktreePath: string
): string {
  return join(worktreeLogDirectory(paths, worktreePath), "gradle-home");
}

export interface WorktreeMetroPaths {
  fingerprintPath: string;
  tmpDirectory: string;
}

/** Metro cache state stays with this worktree, but outside Metro's TMPDIR. */
export function worktreeMetroPaths(
  paths: RepositoryPaths,
  worktreePath: string
): WorktreeMetroPaths {
  const root = join(worktreeLogDirectory(paths, worktreePath), "metro-cache");

  return {
    fingerprintPath: join(root, "inputs.sha256"),
    tmpDirectory: join(root, "tmp"),
  };
}

/** `<repository>/<platform>/<native-fingerprint>/artifact` from the spec. */
export function sharedBuildDirectory(
  paths: RepositoryPaths,
  platform: Platform,
  fingerprint: string
): string {
  return join(paths.buildRoot, platform, fingerprint);
}
