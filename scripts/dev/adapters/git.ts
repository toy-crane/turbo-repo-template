import { realpathSync } from "node:fs";

import { run, runOrThrow } from "./command";

export interface GitContext {
  /** Shared by every worktree of one repository; the unit the pool belongs to. */
  commonDirectory: string;
  /** For humans only. Ownership never depends on it. */
  label: string;
  worktreePath: string;
}

/**
 * Branch names change under a folder and detached HEAD has none, so the
 * normalized real path is the identifier and the branch is decoration.
 */
export function normalizePath(path: string): string {
  try {
    return realpathSync.native(path);
  } catch {
    return path;
  }
}

async function readLabel(cwd: string): Promise<string> {
  const branch = await run(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
    cwd,
  });
  const name = branch.stdout.trim();

  if (name && name !== "HEAD") {
    return name;
  }

  const head = await run(["git", "rev-parse", "--short", "HEAD"], { cwd });

  return head.stdout.trim() || "detached";
}

export async function readGitContext(cwd: string): Promise<GitContext> {
  const [worktree, common] = await Promise.all([
    runOrThrow(["git", "rev-parse", "--show-toplevel"], { cwd }),
    runOrThrow(
      ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
      { cwd }
    ),
  ]);

  return {
    commonDirectory: normalizePath(common.trim()),
    label: await readLabel(cwd),
    worktreePath: normalizePath(worktree.trim()),
  };
}

/** Every checkout Git still knows about, including the default one. */
export async function listWorktrees(cwd: string): Promise<string[]> {
  const output = await runOrThrow(["git", "worktree", "list", "--porcelain"], {
    cwd,
  });

  return output
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => normalizePath(line.slice("worktree ".length).trim()));
}
