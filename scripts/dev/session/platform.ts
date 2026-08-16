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
  writeAvdDisplayName,
} from "../adapters/android";
import { androidApkPath } from "../adapters/expo";
import {
  approveUrlSchemes,
  bootSimulator,
  createSimulator,
  eraseSimulator,
  installApp,
  installedAppPath,
  isSimulatorBooted,
  listSimulators,
  missingIosTooling,
  openUrl as openIosUrl,
  openSimulatorApp,
  renameSimulator,
  shutdownSimulator,
  terminateApp,
} from "../adapters/ios";
import {
  androidDisplayName,
  nextName,
  planPoolRename,
  planSimulatorRename,
  poolNamePrefix,
  simulatorSlotName,
} from "../device-names";
import { developmentClientSchemes } from "../environment";
import type { Platform } from "../options";
import { worktreeGradleHome } from "../paths";
import type { SessionContext } from "./context";

/** The exact device this run talks to. Every command names it explicitly. */
export interface DeviceHandle {
  /** The identifier stored in the pool. */
  deviceId: string;
  /** What this platform's commands address right now. */
  target: string;
}

export interface BootInput {
  deviceId: string;
  /** Devices of this platform that other worktrees hold; their names stay. */
  leasedElsewhere?: ReadonlySet<string>;
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

export interface DriverInput {
  androidPackage: string;
  bundleIdentifier: string;
  gradleUserHome: string;
  mobileDirectory: string;
  platform: Platform;
  /** Deep-link schemes the development client answers to. */
  schemes: string[];
  slug: string;
}

/**
 * The leased device shows its slot by name; a name collision is freed first.
 * The name is a label, not a dependency: a rename that fails must never keep
 * a simulator that can boot from booting.
 */
async function applySimulatorSlotName(
  deviceId: string,
  slug: string,
  slot: number,
  leasedElsewhere: ReadonlySet<string>
): Promise<void> {
  try {
    const steps = planSimulatorRename(
      await listSimulators(),
      deviceId,
      simulatorSlotName(slug, slot),
      poolNamePrefix(slug),
      leasedElsewhere
    );

    for (const step of steps) {
      // biome-ignore lint/performance/noAwaitInLoops: the collision holder must be renamed before its name is reused.
      await renameSimulator(step.udid, step.name);
    }
  } catch {
    // Left as is: `dev:status` still shows the UDID and slot mapping.
  }
}

/** Same rule on the way back: the pool name is best effort after the erase. */
async function restorePoolName(deviceId: string, slug: string): Promise<void> {
  try {
    const step = planPoolRename(
      await listSimulators(),
      deviceId,
      poolNamePrefix(slug)
    );

    if (step) {
      await renameSimulator(step.udid, step.name);
    }
  } catch {
    // The next lease renames it again; nothing depends on the pool name.
  }
}

function createIosDriver(
  bundleIdentifier: string,
  schemes: string[],
  slug: string
): PlatformDriver {
  return {
    buildEnv: (base) => base,
    buildTarget: (handle) => handle.target,
    createDevice: createSimulator,
    ensureBooted: async ({ deviceId, leasedElsewhere, slot }) => {
      await applySimulatorSlotName(
        deviceId,
        slug,
        slot,
        leasedElsewhere ?? new Set()
      );

      // The device reads its scheme approvals when it boots, so a device that
      // is already up has to come down for a new approval to take effect.
      const approved = await approveUrlSchemes(
        deviceId,
        bundleIdentifier,
        schemes
      );

      if (approved && (await isSimulatorBooted(deviceId))) {
        await shutdownSimulator(deviceId);
      }

      await bootSimulator(deviceId);
      await openSimulatorApp();

      return { deviceId, target: deviceId };
    },
    eraseToPool: async (deviceId) => {
      await eraseSimulator(deviceId);
      // The slot name goes with the lease; a pool device is anonymous again.
      await restorePoolName(deviceId, slug);
    },
    existingDeviceIds: async () =>
      new Set((await listSimulators()).map((device) => device.udid)),
    existingDeviceNames: async () =>
      new Set((await listSimulators()).map((device) => device.name)),
    installArtifact: (handle, artifactPath) =>
      installApp(handle.target, artifactPath),
    missingTooling: missingIosTooling,
    nextDeviceName: (projectSlug, taken) =>
      nextName(poolNamePrefix(projectSlug), taken),
    prepareForMetro: () => Promise.resolve(),
    producedArtifact: (handle) =>
      installedAppPath(handle.target, bundleIdentifier),
    relaunchUrl: async (handle, url) => {
      // Same reason as Android: the development client keeps whichever server
      // URL it last used, and a running app turns the deep link into a dialog.
      await terminateApp(handle.target, bundleIdentifier);
      await openIosUrl(handle.target, url);
    },
    shutdown: shutdownSimulator,
  };
}

function createAndroidDriver(
  mobileDirectory: string,
  androidPackage: string,
  gradleUserHome: string,
  slug: string
): PlatformDriver {
  const sdk: AndroidSdk = resolveAndroidSdk();

  return {
    buildEnv: (base) => ({
      ...androidEnv(sdk, base),
      GRADLE_OPTS: [base.GRADLE_OPTS?.trim(), "-Dorg.gradle.daemon=false"]
        .filter(Boolean)
        .join(" "),
      GRADLE_USER_HOME: gradleUserHome,
    }),
    // `expo run:android --device` matches on the AVD name; an adb serial is
    // rejected, which is the opposite of the iOS command.
    buildTarget: (handle) => handle.deviceId,
    createDevice: (name) => createAvd(sdk, name),
    ensureBooted: async ({ deviceId, logPath, slot }) => {
      const target = await startEmulator({
        avdName: deviceId,
        // The emulator reads its config at boot and may rewrite it on exit,
        // so the label goes in only when a new instance is about to start.
        beforeSpawn: () => {
          writeAvdDisplayName(deviceId, androidDisplayName(slug, slot));
        },
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
      // The label goes with the lease, same as the iOS slot name.
      writeAvdDisplayName(deviceId, undefined);
    },
    existingDeviceIds: async () => new Set(await listAvds(sdk)),
    // An AVD is addressed by its name, so the ids are the names.
    existingDeviceNames: async () => new Set(await listAvds(sdk)),
    installArtifact: (handle, artifactPath) =>
      installApk(sdk, handle.target, artifactPath),
    missingTooling: () => Promise.resolve(missingAndroidTooling(sdk)),
    nextDeviceName: (projectSlug, taken) =>
      nextName(`${projectSlug}_dev_`, taken),
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
  gradleUserHome,
  mobileDirectory,
  platform,
  schemes,
  slug,
}: DriverInput): PlatformDriver {
  return platform === "ios"
    ? createIosDriver(bundleIdentifier, schemes, slug)
    : createAndroidDriver(
        mobileDirectory,
        androidPackage,
        gradleUserHome,
        slug
      );
}

/** The driver every command wants: this project, that platform. */
export function driverFor(
  context: SessionContext,
  platform: Platform
): PlatformDriver {
  return createPlatformDriver({
    androidPackage: context.project.androidPackage,
    bundleIdentifier: context.project.bundleIdentifier,
    gradleUserHome: worktreeGradleHome(context.paths, context.git.worktreePath),
    mobileDirectory: context.mobileDirectory,
    platform,
    schemes: developmentClientSchemes(
      context.project.scheme,
      context.project.slug
    ),
    slug: context.project.slug,
  });
}
