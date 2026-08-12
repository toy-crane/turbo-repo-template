import { readFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_API_PORT = 54_321;
const HEALTH_TIMEOUT_MS = 3000;
const API_SECTION_PATTERN = /^\s*\[api\]\s*$/;
const SECTION_PATTERN = /^\s*\[/;
const PORT_PATTERN = /^\s*port\s*=\s*(\d+)/;

/**
 * Every worktree shares one local stack, so the port comes from the committed
 * config rather than a constant that would drift the moment it is changed.
 */
export function readSupabaseApiPort(repositoryRoot: string): number {
  let contents = "";

  try {
    contents = readFileSync(
      join(repositoryRoot, "supabase", "config.toml"),
      "utf8"
    );
  } catch {
    return DEFAULT_API_PORT;
  }

  let inApiSection = false;

  for (const line of contents.split("\n")) {
    if (API_SECTION_PATTERN.test(line)) {
      inApiSection = true;
      continue;
    }

    if (inApiSection) {
      if (SECTION_PATTERN.test(line)) {
        return DEFAULT_API_PORT;
      }

      const match = PORT_PATTERN.exec(line);

      if (match?.[1]) {
        return Number.parseInt(match[1], 10);
      }
    }
  }

  return DEFAULT_API_PORT;
}

/**
 * A port that answers is not enough — some other program could hold it. The
 * session must not start or reset the stack, so it only looks.
 */
export async function isSupabaseRunning(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/auth/v1/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });

    return response.ok;
  } catch {
    return false;
  }
}
