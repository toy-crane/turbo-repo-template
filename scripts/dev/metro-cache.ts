import { createHash, randomUUID } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const METRO_INPUT_FILES = [
  "bun.lock",
  "package.json",
  "apps/mobile/package.json",
  "apps/mobile/metro.config.js",
  "apps/mobile/babel.config.js",
  "apps/mobile/app.config.ts",
  "apps/mobile/app.json",
  "apps/mobile/env.ts",
  "apps/mobile/src/features/auth/config/google-url-scheme.ts",
  "apps/mobile/tsconfig.json",
] as const;

interface MetroPackageInput {
  name: string;
  resolveFrom?: string;
}

const METRO_PACKAGES: readonly MetroPackageInput[] = [
  { name: "@expo/metro-config", resolveFrom: "expo" },
  { name: "babel-preset-expo" },
  { name: "expo" },
  { name: "expo-router" },
  { name: "react-native" },
  { name: "react-native-enriched-markdown" },
  { name: "react-native-reanimated" },
  { name: "react-native-worklets" },
  { name: "uniwind" },
];

function isMissingFile(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

function patchFiles(worktreePath: string): string[] {
  try {
    return readdirSync(join(worktreePath, "patches"), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".patch"))
      .map((entry) => `patches/${entry.name}`)
      .sort();
  } catch (error) {
    if (isMissingFile(error)) {
      return [];
    }

    throw error;
  }
}

function installedPackageVersion(
  worktreePath: string,
  packageName: string,
  resolveFrom?: string
): string {
  const packagePath = [...packageName.split("/"), "package.json"];
  const candidates: string[] = [];

  if (resolveFrom) {
    const requireFromMobile = createRequire(
      join(worktreePath, "apps", "mobile", "metro-cache-resolver.cjs")
    );

    try {
      const parentManifest = requireFromMobile.resolve(
        `${resolveFrom}/package.json`
      );
      candidates.push(
        createRequire(parentManifest).resolve(`${packageName}/package.json`)
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "MODULE_NOT_FOUND") {
        throw error;
      }
    }
  }

  candidates.push(
    join(worktreePath, "apps", "mobile", "node_modules", ...packagePath),
    join(worktreePath, "node_modules", ...packagePath)
  );

  for (const candidate of new Set(candidates)) {
    try {
      const manifest = JSON.parse(readFileSync(candidate, "utf8")) as {
        version?: unknown;
      };

      return typeof manifest.version === "string"
        ? manifest.version
        : "<version-missing>";
    } catch (error) {
      if (isMissingFile(error)) {
        continue;
      }

      throw new Error(`${candidate}을 읽지 못했습니다.`, { cause: error });
    }
  }

  return "<package-missing>";
}

/**
 * Metro does not expose a complete cache-input fingerprint. This deliberately
 * small list covers the dependency and configuration boundaries that have
 * produced stale cross-worktree bundles in this repository.
 */
export function metroInputFingerprint(worktreePath: string): string {
  const hash = createHash("sha256");
  const inputFiles = [...METRO_INPUT_FILES, ...patchFiles(worktreePath)];

  for (const relativePath of inputFiles) {
    hash.update(`file:${relativePath}\0`);

    try {
      hash.update(readFileSync(join(worktreePath, relativePath)));
    } catch (error) {
      if (!isMissingFile(error)) {
        throw error;
      }

      hash.update("<file-missing>");
    }

    hash.update("\0");
  }

  for (const { name, resolveFrom } of METRO_PACKAGES) {
    hash.update(
      `package:${name}\0${installedPackageVersion(worktreePath, name, resolveFrom)}\0`
    );
  }

  return hash.digest("hex");
}

export function readMetroInputFingerprint(path: string): string | null {
  try {
    return readFileSync(path, "utf8").trim() || null;
  } catch (error) {
    if (isMissingFile(error)) {
      return null;
    }

    throw error;
  }
}

/** Save after Metro is ready, so this records which inputs received a reset. */
export function writeMetroInputFingerprint(
  path: string,
  fingerprint: string
): void {
  mkdirSync(dirname(path), { recursive: true });

  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;

  try {
    writeFileSync(temporaryPath, `${fingerprint}\n`);
    renameSync(temporaryPath, path);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
}
