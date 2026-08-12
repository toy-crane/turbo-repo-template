import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

import type { Platform } from "../options";
import { run, runToLog } from "./command";

/**
 * `pod install` fails with `Encoding::CompatibilityError` under an empty or
 * non-UTF-8 locale, which is how non-interactive shells start here. The build
 * gets a UTF-8 locale regardless of the developer's own setting; nothing about
 * the result depends on the language.
 */
export function buildEnv(base: Record<string, string>): Record<string, string> {
  return { ...base, LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" };
}

export function fingerprintBinary(mobileDirectory: string): string {
  return join(mobileDirectory, "node_modules", ".bin", "fingerprint");
}

export function expoBinary(mobileDirectory: string): string {
  return join(mobileDirectory, "node_modules", ".bin", "expo");
}

/**
 * Identifies the native build. Everything JavaScript, TypeScript or style
 * leaves it unchanged, so an ordinary edit reuses the installed app.
 */
export async function generateFingerprint(
  mobileDirectory: string,
  platform: Platform,
  env: Record<string, string>
): Promise<string> {
  const result = await run(
    [
      fingerprintBinary(mobileDirectory),
      "fingerprint:generate",
      "--platform",
      platform,
    ],
    { cwd: mobileDirectory, env }
  );

  if (result.code !== 0) {
    throw new Error(
      `native fingerprint를 만들지 못했습니다.\n${(result.stderr || result.stdout).trim()}`
    );
  }

  const line = result.stdout.trim().split("\n").at(-1) ?? "";
  const parsed: unknown = JSON.parse(line);
  const { hash } = parsed as { hash?: unknown };

  if (typeof hash !== "string" || hash.length === 0) {
    throw new Error("native fingerprint 출력에서 hash를 찾지 못했습니다.");
  }

  return hash;
}

export interface DevBuildInput {
  device: string;
  env: Record<string, string>;
  logPath: string;
  mobileDirectory: string;
  onOutput?: (text: string) => void;
  platform: Platform;
}

/**
 * `--no-bundler` because this session owns Metro on its own port; letting the
 * build start a second one would bind the default port and serve the wrong
 * worktree. `--device` is always passed: without it the CLI waits forever on a
 * device picker that a non-interactive shell can never answer.
 *
 * The prebuild runs first because `run:<platform>` skips it whenever the
 * native folder already exists. This build was asked for precisely because the
 * fingerprint changed, so a leftover folder from the previous fingerprint is
 * the one thing that must not be reused.
 */
export async function runDevBuild({
  device,
  env,
  logPath,
  mobileDirectory,
  onOutput,
  platform,
}: DevBuildInput): Promise<void> {
  const prebuild = await runToLog(
    [
      expoBinary(mobileDirectory),
      "prebuild",
      "--platform",
      platform,
      "--clean",
    ],
    { cwd: mobileDirectory, env: buildEnv(env), logPath, onOutput }
  );

  if (prebuild.code !== 0) {
    throw new Error(
      `네이티브 프로젝트를 만들지 못했습니다. 자세한 내용은 ${logPath}를 확인해 주세요.`
    );
  }

  const result = await runToLog(
    [
      expoBinary(mobileDirectory),
      platform === "ios" ? "run:ios" : "run:android",
      "--device",
      device,
      "--no-bundler",
      // Do not add `--port` here. The CLI rejects it together with
      // `--no-bundler` ("mutually exclusive arguments") and fails the build
      // before it starts. The app this command launches at the end therefore
      // aims at the default port, which on this machine may be another
      // worktree's Metro — the session corrects that right afterwards by
      // quitting the app and reopening it on this worktree's own URL.
    ],
    { cwd: mobileDirectory, env: buildEnv(env), logPath, onOutput }
  );

  if (result.code !== 0) {
    throw new Error(
      `Development Build에 실패했습니다. 자세한 내용은 ${logPath}를 확인해 주세요.`
    );
  }
}

export function androidApkPath(mobileDirectory: string): string {
  return join(
    mobileDirectory,
    "android",
    "app",
    "build",
    "outputs",
    "apk",
    "debug",
    "app-debug.apk"
  );
}

export function artifactName(platform: Platform, slug: string): string {
  return platform === "ios" ? `${slug}.app` : `${slug}.apk`;
}

/**
 * Only a finished copy becomes a shared entry: the artifact lands next to the
 * target and is renamed into place, so a build that dies halfway never leaves
 * something the next worktree would install.
 */
export function storeSharedBuild(
  directory: string,
  artifactPath: string,
  name: string
): string {
  const target = join(directory, name);
  const staging = `${target}.partial`;

  mkdirSync(directory, { recursive: true });
  rmSync(staging, { force: true, recursive: true });
  cpSync(artifactPath, staging, { recursive: true });
  rmSync(target, { force: true, recursive: true });
  renameSync(staging, target);

  return target;
}

export function findSharedBuild(
  directory: string,
  name: string
): string | undefined {
  const target = join(directory, name);

  return existsSync(target) ? target : undefined;
}
