import { createHash } from "node:crypto";

import { parseMobileEnv } from "../../apps/mobile/env";

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

export interface SessionPorts {
  api: number;
  supabase: number;
}

export interface MobileEnvironmentInput {
  /** Values read from `apps/mobile/.env.local`. */
  fileValues: Record<string, string>;
  ports: SessionPorts;
}

/**
 * The session owns the two ports and keeps every other value the developer
 * already has. Ports carry no host, so the same environment serves both
 * platforms and one Metro can bundle for either; the app turns each port into
 * an address its own platform can reach. Validation runs through the app's own
 * schema so a missing key fails here rather than on the app's first screen.
 */
export function buildMobileEnvironment({
  fileValues,
  ports,
}: MobileEnvironmentInput): Record<string, string> {
  const merged = {
    ...fileValues,
    EXPO_PUBLIC_DEV_SESSION_API_PORT: String(ports.api),
    EXPO_PUBLIC_DEV_SESSION_SUPABASE_PORT: String(ports.supabase),
  };

  parseMobileEnv(merged);

  return merged;
}

/** A stable, non-reversible identity for the public environment Metro owns. */
export function mobileEnvironmentFingerprint(
  environment: Record<string, string>
): string {
  const entries = Object.entries(environment).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  return createHash("sha256").update(JSON.stringify(entries)).digest("hex");
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
