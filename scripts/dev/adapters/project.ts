import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface MobileProject {
  androidPackage: string;
  bundleIdentifier: string;
  /** Also the fallback deep-link scheme the development client answers to. */
  scheme: string;
  slug: string;
}

function requireString(value: unknown, field: string, file: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${file}의 ${field} 값을 읽지 못했습니다.`);
  }

  return value;
}

/**
 * Read from `app.json` rather than the resolved Expo config: this runs before
 * the environment is validated, and resolving `app.config.ts` would fail for a
 * reason that has nothing to do with the identifiers being read.
 */
export function readMobileProject(mobileDirectory: string): MobileProject {
  const file = join(mobileDirectory, "app.json");
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  const expo = (parsed as { expo?: Record<string, unknown> }).expo ?? {};
  const ios = (expo.ios ?? {}) as Record<string, unknown>;
  const android = (expo.android ?? {}) as Record<string, unknown>;

  return {
    androidPackage: requireString(android.package, "android.package", file),
    bundleIdentifier: requireString(
      ios.bundleIdentifier,
      "ios.bundleIdentifier",
      file
    ),
    scheme: requireString(expo.scheme, "scheme", file),
    slug: requireString(expo.slug, "slug", file),
  };
}
