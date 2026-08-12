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
