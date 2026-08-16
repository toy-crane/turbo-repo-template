import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

/** The AVD an emulator console reports for a serial, or nothing on error. */
async function avdNameForSerial(
  sdk: AndroidSdk,
  serial: string
): Promise<string | undefined> {
  const { code, stdout } = await run([
    sdk.adb,
    "-s",
    serial,
    "emu",
    "avd",
    "name",
  ]);
  const name = stdout.split("\n")[0]?.trim();

  return code === 0 && name ? name : undefined;
}

/** Serial per running AVD, for read-only display. */
export async function listRunningAvds(
  sdk: AndroidSdk
): Promise<Map<string, string>> {
  const serials = await runningSerials(sdk);
  const names = await Promise.all(
    serials.map((serial) => avdNameForSerial(sdk, serial))
  );
  const found = new Map<string, string>();

  for (const [index, serial] of serials.entries()) {
    const name = names[index];

    if (name) {
      found.set(name, serial);
    }
  }

  return found;
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
    if ((await avdNameForSerial(sdk, serial)) === avdName) {
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
  /**
   * Runs only when a new emulator process is about to start, after the
   * running-instance and console-port checks. This is the one moment the AVD
   * is known to be down, so it is where an edit to its files belongs.
   */
  beforeSpawn?: () => void;
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
  beforeSpawn,
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
  // This also catches an instance of this AVD that is still booting: adb lists
  // it as `offline`, which the running check above does not see, but its
  // console port is already taken.
  if (!(await isPortFree(port))) {
    throw new Error(
      `Emulator 콘솔 포트 ${port}을(를) 다른 프로그램이 쓰고 있습니다. 이 저장소가 관리하지 않는 Emulator를 종료한 뒤 다시 실행해 주세요.`
    );
  }

  beforeSpawn?.();

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
 * Makes the emulator's own loopback reach this worktree's Metro. The
 * development client deep link carries `127.0.0.1`, so this forwarding is the
 * only way that address means the host machine inside the emulator.
 */
export async function reversePort(
  sdk: AndroidSdk,
  serial: string,
  port: number
): Promise<void> {
  await runOrThrow([
    sdk.adb,
    "-s",
    serial,
    "reverse",
    `tcp:${port}`,
    `tcp:${port}`,
  ]);
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

const DISPLAY_NAME_KEY = "avd.ini.displayname";

function avdConfigPath(avdName: string, home: string): string {
  return join(avdDirectory(avdName, home), "config.ini");
}

/** The display name Android Studio and the emulator window show for an AVD. */
export function readAvdDisplayName(
  avdName: string,
  home: string = homedir()
): string | undefined {
  let contents: string;

  try {
    contents = readFileSync(avdConfigPath(avdName, home), "utf8");
  } catch {
    return;
  }

  for (const line of contents.split("\n")) {
    const separator = line.indexOf("=");

    if (separator > 0 && line.slice(0, separator).trim() === DISPLAY_NAME_KEY) {
      return line.slice(separator + 1).trim() || undefined;
    }
  }
}

/**
 * Only safe while the emulator is down: the emulator reads the config at boot
 * and may rewrite it on exit. `undefined` removes the key, so a released AVD
 * stops carrying the previous worktree's label.
 */
export function writeAvdDisplayName(
  avdName: string,
  displayName: string | undefined,
  home: string = homedir()
): void {
  const path = avdConfigPath(avdName, home);
  let contents: string;

  try {
    contents = readFileSync(path, "utf8");
  } catch {
    // An AVD without a config cannot be labeled; the id keeps identifying it.
    return;
  }

  const lines = contents.split("\n").filter((line) => {
    const separator = line.indexOf("=");

    return !(
      separator > 0 && line.slice(0, separator).trim() === DISPLAY_NAME_KEY
    );
  });

  while (lines.at(-1) === "") {
    lines.pop();
  }

  if (displayName !== undefined) {
    lines.push(`${DISPLAY_NAME_KEY}=${displayName}`);
  }

  // Write beside and rename: a config.ini cut short would stop the AVD from
  // booting at all, which is far worse than a missing label.
  const temporaryPath = `${path}.${process.pid}.tmp`;

  writeFileSync(temporaryPath, `${lines.join("\n")}\n`);
  renameSync(temporaryPath, path);
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
