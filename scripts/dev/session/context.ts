import { readFileSync } from "node:fs";
import { join } from "node:path";

import { type GitContext, readGitContext } from "../adapters/git";
import { type MobileProject, readMobileProject } from "../adapters/project";
import { isSupabaseRunning, readSupabaseApiPort } from "../adapters/supabase";
import { parseEnvFile } from "../environment";
import { type RepositoryPaths, repositoryPaths } from "../paths";

export interface SessionIo {
  log: (message: string) => void;
}

export interface SessionContext {
  apiDirectory: string;
  git: GitContext;
  mobileDirectory: string;
  paths: RepositoryPaths;
  project: MobileProject;
  supabasePort: number;
}

export async function createSessionContext(
  cwd: string
): Promise<SessionContext> {
  const git = await readGitContext(cwd);
  const mobileDirectory = join(git.worktreePath, "apps", "mobile");

  return {
    apiDirectory: join(git.worktreePath, "apps", "api"),
    git,
    mobileDirectory,
    paths: repositoryPaths(git.commonDirectory),
    project: readMobileProject(mobileDirectory),
    supabasePort: readSupabaseApiPort(git.worktreePath),
  };
}

/**
 * The session reads the developer's file and never writes it: the two dynamic
 * addresses travel through the child environment instead.
 */
export function readMobileEnvFile(
  context: SessionContext
): Record<string, string> {
  const file = join(context.mobileDirectory, ".env.local");

  try {
    return parseEnvFile(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(
      `${file}을 읽지 못했습니다. apps/mobile/.env.example을 보고 값을 채워 주세요.`,
      { cause: error }
    );
  }
}

/**
 * The stack is shared by every worktree, so the session only checks it. It
 * must not start, stop or reset something another worktree is using.
 */
export async function requireSupabase(context: SessionContext): Promise<void> {
  if (await isSupabaseRunning(context.supabasePort)) {
    return;
  }

  throw new Error(
    `로컬 Supabase가 127.0.0.1:${context.supabasePort}에서 응답하지 않습니다. 먼저 bun run db:start를 실행해 주세요.`
  );
}
