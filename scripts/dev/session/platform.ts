import { existsSync } from "node:fs";

import {
  type AndroidSdk,
  androidEnv,
  createAvd,
  emulatorPort,
  eraseAvdData,
  findSerialForAvd,
  forceStop,
  installApk,
  listAvds,
  missingAndroidTooling,
  openUrl as openAndroidUrl,
  resolveAndroidSdk,
  reversePort,
  shutdownEmulator,
  startEmulator,
} from "../adapters/android";
import { androidApkPath } from "../adapters/expo";
import {
  bootSimulator,
  createSimulator,
  eraseSimulator,
  installApp,
  installedAppPath,
  listSimulators,
  missingIosTooling,
  openUrl as openIosUrl,
  openSimulatorApp,
  shutdownSimulator,
} from "../adapters/ios";
import type { Platform } from "../options";

/** The exact device this run talks to. Every command names it explicitly. */
export interface DeviceHandle {
  /** The identifier stored in the pool. */
  deviceId: string;
  /** What this platform's commands address right now. */
  target: string;
}

export interface BootInput {
  deviceId: string;
  logPath: string;
  slot: number;
}

export interface PlatformDriver {
  /** Additions the native build needs in its environment. */
  buildEnv: (base: Record<string, string>) => Record<string, string>;
  /** What `expo run:<platform> --device` expects for this device. */
  buildTarget: (handle: DeviceHandle) => string;
  createDevice: (name: string) => Promise<string>;
  ensureBooted: (input: BootInput) => Promise<DeviceHandle>;
  /** Shuts the device down and wipes it before it goes back to the pool. */
  eraseToPool: (deviceId: string) => Promise<void>;
  existingDeviceIds: () => Promise<Set<string>>;
  /**
   * Display names already in use. On iOS these are not the pool's identifiers,
   * so a new device has to be named against this list rather than the ids.
   */
  existingDeviceNames: () => Promise<Set<string>>;
  installArtifact: (
    handle: DeviceHandle,
    artifactPath: string
  ) => Promise<void>;
  missingTooling: () => Promise<string[]>;
  nextDeviceName: (slug: string, taken: Set<string>) => string;
  /** Anything the device needs before it can reach this worktree's Metro. */
  prepareForMetro: (handle: DeviceHandle, metroPort: number) => Promise<void>;
  /** Where the finished build sits after `expo run:<platform>`. */
  producedArtifact: (handle: DeviceHandle) => Promise<string | undefined>;
  relaunchUrl: (handle: DeviceHandle, url: string) => Promise<void>;
  shutdown: (deviceId: string) => Promise<void>;
}

function nextName(prefix: string, taken: Set<string>): string {
  for (let index = 1; ; index += 1) {
    const name = `${prefix}${index}`;

    if (!taken.has(name)) {
      return name;
    }
  }
}

export interface DriverInput {
  androidPackage: string;
  bundleIdentifier: string;
  mobileDirectory: string;
  platform: Platform;
}

function createIosDriver(bundleIdentifier: string): PlatformDriver {
  return {
    buildEnv: (base) => base,
    buildTarget: (handle) => handle.target,
    createDevice: createSimulator,
    ensureBooted: async ({ deviceId }) => {
      await bootSimulator(deviceId);
      await openSimulatorApp();

      return { deviceId, target: deviceId };
    },
    eraseToPool: eraseSimulator,
    existingDeviceIds: async () =>
      new Set((await listSimulators()).map((device) => device.udid)),
    existingDeviceNames: async () =>
      new Set((await listSimulators()).map((device) => device.name)),
    installArtifact: (handle, artifactPath) =>
      installApp(handle.target, artifactPath),
    missingTooling: missingIosTooling,
    nextDeviceName: (slug, taken) => nextName(`${slug}-dev-`, taken),
    prepareForMetro: () => Promise.resolve(),
    producedArtifact: (handle) =>
      installedAppPath(handle.target, bundleIdentifier),
    relaunchUrl: (handle, url) => openIosUrl(handle.target, url),
    shutdown: shutdownSimulator,
  };
}

function createAndroidDriver(
  mobileDirectory: string,
  androidPackage: string
): PlatformDriver {
  const sdk: AndroidSdk = resolveAndroidSdk();

  return {
    buildEnv: (base) => androidEnv(sdk, base),
    // `expo run:android --device` matches on the AVD name; an adb serial is
    // rejected, which is the opposite of the iOS command.
    buildTarget: (handle) => handle.deviceId,
    createDevice: (name) => createAvd(sdk, name),
    ensureBooted: async ({ deviceId, logPath, slot }) => {
      const target = await startEmulator({
        avdName: deviceId,
        logPath,
        port: emulatorPort(slot),
        sdk,
      });

      return { deviceId, target };
    },
    eraseToPool: async (deviceId) => {
      const serial = await findSerialForAvd(sdk, deviceId);

      if (serial) {
        await shutdownEmulator(sdk, serial);
      }

      eraseAvdData(deviceId);
    },
    existingDeviceIds: async () => new Set(await listAvds(sdk)),
    // An AVD is addressed by its name, so the ids are the names.
    existingDeviceNames: async () => new Set(await listAvds(sdk)),
    installArtifact: (handle, artifactPath) =>
      installApk(sdk, handle.target, artifactPath),
    missingTooling: () => Promise.resolve(missingAndroidTooling(sdk)),
    nextDeviceName: (slug, taken) => nextName(`${slug}_dev_`, taken),
    prepareForMetro: (handle, metroPort) =>
      reversePort(sdk, handle.target, metroPort),
    producedArtifact: () => {
      const apk = androidApkPath(mobileDirectory);

      return Promise.resolve(existsSync(apk) ? apk : undefined);
    },
    relaunchUrl: async (handle, url) => {
      // The dev client keeps whichever server URL it last used, so a plain
      // launch can quietly load another worktree's bundle.
      await forceStop(sdk, handle.target, androidPackage);
      await openAndroidUrl(sdk, handle.target, url, androidPackage);
    },
    shutdown: async (deviceId) => {
      const serial = await findSerialForAvd(sdk, deviceId);

      if (serial) {
        await shutdownEmulator(sdk, serial);
      }
    },
  };
}

export function createPlatformDriver({
  androidPackage,
  bundleIdentifier,
  mobileDirectory,
  platform,
}: DriverInput): PlatformDriver {
  return platform === "ios"
    ? createIosDriver(bundleIdentifier)
    : createAndroidDriver(mobileDirectory, androidPackage);
}
