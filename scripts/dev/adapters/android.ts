import { existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { run, runOrThrow } from "./command";
import { isPortFree, spawnSession } from "./processes";

/** The spec fixes the default configuration. */
export const ANDROID_SYSTEM_IMAGE =
  "system-images;android-35;google_apis_playstore;arm64-v8a";
export const ANDROID_DEVICE_PROFILE = "pixel_9_pro";
export const ANDROID_DEVICE_NAME = "Pixel 9 Pro";

const WHITESPACE_PATTERN = /\s+/;
const EMULATOR_BASE_PORT = 5554;
const BOOT_TIMEOUT_MS = 180_000;
const BOOT_POLL_MS = 1000;
const SHUTDOWN_TIMEOUT_MS = 60_000;
const SHUTDOWN_POLL_MS = 500;

export interface AndroidSdk {
  adb: string;
  avdmanager: string;
  emulator: string;
  root: string;
}

/**
 * Non-interactive shells here start without `ANDROID_HOME`, and the Gradle
 * build reads it, so the session resolves the SDK itself and passes it down.
 */
export function resolveAndroidSdk(
  env: Record<string, string | undefined> = process.env,
  home: string = homedir()
): AndroidSdk {
  const root =
    env.ANDROID_HOME?.trim() ||
    env.ANDROID_SDK_ROOT?.trim() ||
    join(home, "Library", "Android", "sdk");

  return {
    adb: join(root, "platform-tools", "adb"),
    avdmanager: join(root, "cmdline-tools", "latest", "bin", "avdmanager"),
    emulator: join(root, "emulator", "emulator"),
    root,
  };
}

export function missingAndroidTooling(sdk: AndroidSdk): string[] {
  const missing: string[] = [];

  if (!existsSync(sdk.adb)) {
    missing.push(`Android platform-tools의 adb (${sdk.adb})`);
  }

  if (!existsSync(sdk.emulator)) {
    missing.push(`Android Emulator (${sdk.emulator})`);
  }

  if (!existsSync(sdk.avdmanager)) {
    missing.push(`Android cmdline-tools의 avdmanager (${sdk.avdmanager})`);
  }

  if (
    !existsSync(
      join(
        sdk.root,
        "system-images",
        "android-35",
        "google_apis_playstore",
        "arm64-v8a"
      )
    )
  ) {
    missing.push(`Android system image ${ANDROID_SYSTEM_IMAGE}`);
  }

  return missing;
}

export function androidEnv(
  sdk: AndroidSdk,
  base: Record<string, string>
): Record<string, string> {
  return { ...base, ANDROID_HOME: sdk.root, ANDROID_SDK_ROOT: sdk.root };
}

export async function listAvds(sdk: AndroidSdk): Promise<string[]> {
  const output = await runOrThrow([sdk.emulator, "-list-avds"]);

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.includes(" "));
}

export async function createAvd(
  sdk: AndroidSdk,
  name: string
): Promise<string> {
  await runOrThrow(
    [
      sdk.avdmanager,
      "create",
      "avd",
      "--name",
      name,
      "--package",
      ANDROID_SYSTEM_IMAGE,
      "--device",
      ANDROID_DEVICE_PROFILE,
      "--force",
    ],
    { env: androidEnv(sdk, process.env as Record<string, string>) }
  );

  return name;
}

export function emulatorPort(slot: number): number {
  // The emulator only accepts even console ports, and each instance takes two.
  return EMULATOR_BASE_PORT + slot * 2;
}

export function emulatorSerial(port: number): string {
  return `emulator-${port}`;
}

async function runningSerials(sdk: AndroidSdk): Promise<string[]> {
  const { code, stdout } = await run([sdk.adb, "devices"]);

  if (code !== 0) {
    return [];
  }

  return stdout
    .split("\n")
    .slice(1)
    .map((line) => line.trim().split(WHITESPACE_PATTERN))
    .filter(
      (parts) => parts[1] === "device" && parts[0]?.startsWith("emulator-")
    )
    .map((parts) => parts[0] as string);
}

/**
 * The adb serial is decided by whichever console port was free at boot, so it
 * is looked up from the AVD name every run instead of being stored.
 */
export async function findSerialForAvd(
  sdk: AndroidSdk,
  avdName: string
): Promise<string | undefined> {
  for (const serial of await runningSerials(sdk)) {
    // biome-ignore lint/performance/noAwaitInLoops: the match ends the search, so asking every emulator up front would be wasted work.
    const { code, stdout } = await run([
      sdk.adb,
      "-s",
      serial,
      "emu",
      "avd",
      "name",
    ]);

    if (code === 0 && stdout.split("\n")[0]?.trim() === avdName) {
      return serial;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export interface StartEmulatorInput {
  avdName: string;
  logPath: string;
  port: number;
  sdk: AndroidSdk;
}

/**
 * The console port is chosen from the worktree's slot, so two worktrees never
 * race for the same serial and every later adb command has an exact target.
 */
export async function startEmulator({
  avdName,
  logPath,
  port,
  sdk,
}: StartEmulatorInput): Promise<string> {
  const running = await findSerialForAvd(sdk, avdName);

  if (running) {
    return running;
  }

  // An emulator started on a taken console port fails quietly, so the wait
  // below would end in a boot timeout that says nothing about the real cause.
  if (!(await isPortFree(port))) {
    throw new Error(
      `Emulator 콘솔 포트 ${port}을(를) 다른 프로그램이 쓰고 있습니다. 이 저장소가 관리하지 않는 Emulator를 종료한 뒤 다시 실행해 주세요.`
    );
  }

  spawnSession({
    argv: [
      sdk.emulator,
      "-avd",
      avdName,
      "-port",
      String(port),
      "-no-boot-anim",
    ],
    cwd: sdk.root,
    env: androidEnv(sdk, process.env as Record<string, string>),
    logPath,
  });

  const serial = emulatorSerial(port);

  await waitForBoot(sdk, serial);

  return serial;
}

async function isBooted(sdk: AndroidSdk, serial: string): Promise<boolean> {
  const { code, stdout } = await run([
    sdk.adb,
    "-s",
    serial,
    "shell",
    "getprop",
    "sys.boot_completed",
  ]);

  return code === 0 && stdout.trim() === "1";
}

export async function waitForBoot(
  sdk: AndroidSdk,
  serial: string
): Promise<void> {
  const deadline = Date.now() + BOOT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    // biome-ignore lint/performance/noAwaitInLoops: the emulator boots once, and this waits for it.
    if (await isBooted(sdk, serial)) {
      return;
    }

    await sleep(BOOT_POLL_MS);
  }

  throw new Error(
    `Emulator가 시간 안에 부팅되지 않았습니다 (${serial}). 창을 확인한 뒤 다시 실행해 주세요.`
  );
}

export async function installApk(
  sdk: AndroidSdk,
  serial: string,
  apkPath: string
): Promise<void> {
  await runOrThrow([sdk.adb, "-s", serial, "install", "-r", "-d", apkPath]);
}

/**
 * Makes the emulator's own `127.0.0.1:<port>` reach the host at the same port.
 * The app then uses one address on both platforms, which is what lets a single
 * Metro serve iOS and Android from the same worktree.
 */
export async function reversePorts(
  sdk: AndroidSdk,
  serial: string,
  ports: readonly number[]
): Promise<void> {
  for (const port of ports) {
    // biome-ignore lint/performance/noAwaitInLoops: adb serializes these anyway, and a parallel burst only makes a failure harder to attribute.
    await runOrThrow([
      sdk.adb,
      "-s",
      serial,
      "reverse",
      `tcp:${port}`,
      `tcp:${port}`,
    ]);
  }
}

export async function openUrl(
  sdk: AndroidSdk,
  serial: string,
  url: string,
  packageName: string
): Promise<void> {
  await runOrThrow([
    sdk.adb,
    "-s",
    serial,
    "shell",
    "am",
    "start",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    url,
    packageName,
  ]);
}

export async function forceStop(
  sdk: AndroidSdk,
  serial: string,
  packageName: string
): Promise<void> {
  await run([sdk.adb, "-s", serial, "shell", "am", "force-stop", packageName]);
}

/**
 * Waits for the emulator to actually be gone. `emu kill` only asks: QEMU keeps
 * flushing its writable images for a moment afterwards, so anything that erases
 * those images has to know the process finished first.
 */
export async function shutdownEmulator(
  sdk: AndroidSdk,
  serial: string
): Promise<void> {
  await run([sdk.adb, "-s", serial, "emu", "kill"]);

  const deadline = Date.now() + SHUTDOWN_TIMEOUT_MS;

  while (Date.now() < deadline) {
    // biome-ignore lint/performance/noAwaitInLoops: polling a shutdown is sequential by nature.
    if (!(await runningSerials(sdk)).includes(serial)) {
      return;
    }

    await sleep(SHUTDOWN_POLL_MS);
  }

  throw new Error(
    `Emulator가 시간 안에 종료되지 않았습니다 (${serial}). 창을 닫은 뒤 다시 실행해 주세요.`
  );
}

export function avdDirectory(
  avdName: string,
  home: string = homedir()
): string {
  return join(home, ".android", "avd", `${avdName}.avd`);
}

/**
 * The offline form of `emulator -wipe-data`: the writable images and snapshots
 * are what hold app data and the signed-in session, and the emulator rebuilds
 * them from the system image on the next boot. Doing it with the device down
 * avoids a full boot-and-shutdown cycle just to erase it.
 */
export function eraseAvdData(avdName: string, home: string = homedir()): void {
  const directory = avdDirectory(avdName, home);

  if (!existsSync(directory)) {
    return;
  }

  for (const entry of [
    "userdata-qemu.img",
    "userdata-qemu.img.qcow2",
    "userdata.img",
    "userdata.img.qcow2",
    "cache.img",
    "cache.img.qcow2",
    "snapshots",
  ]) {
    rmSync(join(directory, entry), { force: true, recursive: true });
  }
}
