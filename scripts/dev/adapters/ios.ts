import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { run, runOrThrow } from "./command";

/** The spec fixes the default configuration; both ids must exist locally. */
export const IOS_DEVICE_TYPE_ID =
  "com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro";
export const IOS_RUNTIME_ID = "com.apple.CoreSimulator.SimRuntime.iOS-26-5";
export const IOS_DEVICE_TYPE_NAME = "iPhone 17 Pro";
export const IOS_RUNTIME_NAME = "iOS 26.5";

const ALREADY_BOOTED_PATTERN = /current state: Boot/i;
const ALREADY_SHUTDOWN_PATTERN = /current state: Shutdown/i;

export interface SimulatorDevice {
  booted: boolean;
  name: string;
  udid: string;
}

interface SimctlDevice {
  isAvailable?: boolean;
  name?: string;
  state?: string;
  udid?: string;
}

export async function listSimulators(): Promise<SimulatorDevice[]> {
  const output = await runOrThrow([
    "xcrun",
    "simctl",
    "list",
    "devices",
    "--json",
  ]);
  const parsed: unknown = JSON.parse(output);
  const groups = (parsed as { devices?: Record<string, SimctlDevice[]> })
    .devices;
  const devices: SimulatorDevice[] = [];

  for (const entries of Object.values(groups ?? {})) {
    for (const entry of entries) {
      if (entry.udid && entry.isAvailable !== false) {
        devices.push({
          booted: entry.state === "Booted",
          name: entry.name ?? "",
          udid: entry.udid,
        });
      }
    }
  }

  return devices;
}

/**
 * Reports every missing piece at once. Installing an iOS runtime is a long
 * download, so finding out about the second one afterwards wastes the wait.
 */
export async function missingIosTooling(): Promise<string[]> {
  const missing: string[] = [];
  const xcrun = await run(["xcrun", "simctl", "help"]);

  if (xcrun.code !== 0) {
    return ["Xcode 명령줄 도구 (xcrun simctl)"];
  }

  const [runtimes, deviceTypes] = await Promise.all([
    runOrThrow(["xcrun", "simctl", "list", "runtimes"]),
    runOrThrow(["xcrun", "simctl", "list", "devicetypes"]),
  ]);

  if (!runtimes.includes(IOS_RUNTIME_ID)) {
    missing.push(
      `iOS 시뮬레이터 런타임 ${IOS_RUNTIME_NAME} (${IOS_RUNTIME_ID})`
    );
  }

  if (!deviceTypes.includes(IOS_DEVICE_TYPE_ID)) {
    missing.push(
      `시뮬레이터 기기 종류 ${IOS_DEVICE_TYPE_NAME} (${IOS_DEVICE_TYPE_ID})`
    );
  }

  return missing;
}

export async function createSimulator(name: string): Promise<string> {
  const output = await runOrThrow([
    "xcrun",
    "simctl",
    "create",
    name,
    IOS_DEVICE_TYPE_ID,
    IOS_RUNTIME_ID,
  ]);

  const udid = output.trim();

  if (!udid) {
    throw new Error(`Simulator를 만들지 못했습니다: ${name}.`);
  }

  return udid;
}

function schemeApprovalPath(udid: string, home: string = homedir()): string {
  return join(
    home,
    "Library",
    "Developer",
    "CoreSimulator",
    "Devices",
    udid,
    "data",
    "Library",
    "Preferences",
    "com.apple.launchservices.schemeapproval.plist"
  );
}

function approvalKey(scheme: string): string {
  return `com.apple.CoreSimulator.CoreSimulatorBridge-->${scheme}`;
}

async function readApprovals(path: string): Promise<Record<string, unknown>> {
  if (!existsSync(path)) {
    return {};
  }

  const { code, stdout } = await run([
    "plutil",
    "-convert",
    "json",
    "-o",
    "-",
    path,
  ]);

  if (code !== 0) {
    return {};
  }

  try {
    return JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Without this the simulator asks "Open in …?" for the development client's
 * URL, and a background session has nobody to answer it: the deep link never
 * arrives and the app keeps pointing at whichever Metro it last used. The
 * approvals are read when the device boots, so the caller has to write them
 * before booting — `true` means something changed and a running device has to
 * be restarted for it to count.
 */
export async function approveUrlSchemes(
  udid: string,
  bundleId: string,
  schemes: string[],
  home: string = homedir()
): Promise<boolean> {
  const path = schemeApprovalPath(udid, home);
  const current = await readApprovals(path);
  const missing = schemes.filter(
    (scheme) => current[approvalKey(scheme)] !== bundleId
  );

  if (missing.length === 0) {
    return false;
  }

  if (!existsSync(path)) {
    await runOrThrow(["plutil", "-create", "binary1", path]);
  }

  for (const scheme of missing) {
    // `plutil` reads `.` as a key-path separator, and every key here contains
    // several, so each one is escaped back into a literal.
    const keyPath = approvalKey(scheme).replaceAll(".", String.raw`\.`);

    // biome-ignore lint/performance/noAwaitInLoops: each edit rewrites the same file.
    await runOrThrow([
      "plutil",
      "-replace",
      keyPath,
      "-string",
      bundleId,
      path,
    ]);
  }

  return true;
}

export async function isSimulatorBooted(udid: string): Promise<boolean> {
  return (await listSimulators()).some(
    (device) => device.udid === udid && device.booted
  );
}

export async function bootSimulator(udid: string): Promise<void> {
  const result = await run(["xcrun", "simctl", "boot", udid]);

  // `simctl` treats "already booted" as an error; for us it is the goal state.
  if (result.code !== 0 && !ALREADY_BOOTED_PATTERN.test(result.stderr)) {
    throw new Error(
      `Simulator를 시작하지 못했습니다 (${udid}).\n${result.stderr.trim()}`
    );
  }

  await runOrThrow(["xcrun", "simctl", "bootstatus", udid]);
}

/** Brings the Simulator window up so the developer can watch the app. */
export async function openSimulatorApp(): Promise<void> {
  await run(["open", "-a", "Simulator"]);
}

export async function installApp(udid: string, appPath: string): Promise<void> {
  await runOrThrow(["xcrun", "simctl", "install", udid, appPath]);
}

/** Changes only the display name; the udid, app and data stay untouched. */
export async function renameSimulator(
  udid: string,
  name: string
): Promise<void> {
  await runOrThrow(["xcrun", "simctl", "rename", udid, name]);
}

export async function openUrl(udid: string, url: string): Promise<void> {
  await runOrThrow(["xcrun", "simctl", "openurl", udid, url]);
}

/**
 * Opening the app's own URL while it is already in front makes iOS put a
 * "Open in …?" confirmation on screen, and nothing in a background session can
 * answer it — the deep link never arrives and the app keeps whatever server it
 * had. Quitting first turns the same call into a plain launch.
 */
export async function terminateApp(
  udid: string,
  bundleId: string
): Promise<void> {
  await run(["xcrun", "simctl", "terminate", udid, bundleId]);
}

export async function shutdownSimulator(udid: string): Promise<void> {
  const result = await run(["xcrun", "simctl", "shutdown", udid]);

  if (result.code !== 0 && !ALREADY_SHUTDOWN_PATTERN.test(result.stderr)) {
    throw new Error(
      `Simulator를 종료하지 못했습니다 (${udid}).\n${result.stderr.trim()}`
    );
  }
}

/** Wipes app data and login state before the device goes back to the pool. */
export async function eraseSimulator(udid: string): Promise<void> {
  await shutdownSimulator(udid);
  await runOrThrow(["xcrun", "simctl", "erase", udid]);
}

/**
 * The installed bundle is a complete `.app` that `simctl install` accepts, so
 * the shared store can be filled from the device instead of guessing where
 * Xcode left the build.
 */
export async function installedAppPath(
  udid: string,
  bundleId: string
): Promise<string | undefined> {
  const result = await run([
    "xcrun",
    "simctl",
    "get_app_container",
    udid,
    bundleId,
    "app",
  ]);

  return result.code === 0 ? result.stdout.trim() || undefined : undefined;
}
