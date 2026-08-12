import { parseMobileEnv } from "../../apps/mobile/env";
import type { Platform } from "./options";

/**
 * An Android emulator reaches the host's loopback services through this alias;
 * `127.0.0.1` there is the emulator itself.
 */
const HOSTS: Record<Platform, string> = {
  android: "10.0.2.2",
  ios: "127.0.0.1",
};

const LINE_PATTERN = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

/**
 * Enough of the `.env` format for the files this repository documents. Values
 * are only read: the session passes its own addresses through the child
 * environment and never rewrites `.env.local`.
 */
export function parseEnvFile(contents: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const line of contents.split("\n")) {
    const match = LINE_PATTERN.exec(line);

    if (!match?.[1]) {
      continue;
    }

    const raw = (match[2] ?? "").trim();
    const [quote] = raw;
    const quoted =
      (quote === '"' || quote === "'") && raw.length > 1 && raw.endsWith(quote);

    values[match[1]] = quoted
      ? raw.slice(1, -1)
      : (raw.split(" #")[0] ?? "").trim();
  }

  return values;
}

export interface SessionAddresses {
  apiUrl: string;
  supabaseUrl: string;
}

export function sessionAddresses(
  platform: Platform,
  apiPort: number,
  supabasePort: number
): SessionAddresses {
  const host = HOSTS[platform];

  return {
    apiUrl: `http://${host}:${apiPort}`,
    supabaseUrl: `http://${host}:${supabasePort}`,
  };
}

export interface MobileEnvironmentInput {
  addresses: SessionAddresses;
  /** Values read from `apps/mobile/.env.local`. */
  fileValues: Record<string, string>;
}

/**
 * The session decides the two addresses and keeps every other value the
 * developer already has. Validation runs through the app's own schema so a
 * missing key fails here rather than on the app's first screen.
 */
export function buildMobileEnvironment({
  addresses,
  fileValues,
}: MobileEnvironmentInput): Record<string, string> {
  const merged = {
    ...fileValues,
    EXPO_PUBLIC_DEV_SESSION_API_URL: addresses.apiUrl,
    EXPO_PUBLIC_DEV_SESSION_SUPABASE_URL: addresses.supabaseUrl,
  };

  parseMobileEnv(merged);

  return merged;
}

/** The development client deep link that pins the app to this worktree's Metro. */
export function developmentClientUrl(
  scheme: string,
  metroPort: number
): string {
  const target = encodeURIComponent(`http://127.0.0.1:${metroPort}`);

  return `${scheme}://expo-development-client/?url=${target}`;
}

/**
 * Both schemes a Development Build registers: the app's own, and the one
 * `expo-dev-client` adds. Which of them a given build answers to depends on how
 * it was made, so the session prepares for both and tries the app's own first.
 */
export function developmentClientSchemes(
  scheme: string,
  slug: string
): string[] {
  return [scheme, `exp+${slug}`];
}
