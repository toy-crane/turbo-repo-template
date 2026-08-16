import { mkdirSync } from "node:fs";
import { join } from "node:path";

import {
  artifactName,
  findSharedBuild,
  generateFingerprint,
  runDevBuild,
  storeSharedBuild,
} from "../adapters/expo";
import {
  isPortFree,
  isProcessAlive,
  spawnSession,
  stopProcess,
} from "../adapters/processes";
import { fileSize, waitForHttp, waitForLogMatch } from "../adapters/readiness";
import { planBuild } from "../builds";
import {
  leaseDevice,
  recordInstalledFingerprint,
  selectDevice,
} from "../devices";
import {
  buildMobileEnvironment,
  developmentClientUrl,
  mobileEnvironmentFingerprint,
} from "../environment";
import { withLock } from "../lock";
import {
  metroInputFingerprint,
  readMetroInputFingerprint,
  writeMetroInputFingerprint,
} from "../metro-cache";
import type { Platform } from "../options";
import {
  sharedBuildDirectory,
  worktreeLogDirectory,
  worktreeMetroPaths,
} from "../paths";
import { allocateSlot, apiPort, MAX_SLOT, metroPort } from "../slots";
import {
  type RepositoryState,
  readState,
  type WorktreeRecord,
  writeState,
} from "../state";
import {
  createSessionContext,
  readMobileEnvFile,
  requireSupabase,
  type SessionContext,
  type SessionIo,
} from "./context";
import { fitStateToReality, stopOwnProcesses } from "./maintenance";
import { type DeviceHandle, driverFor, type PlatformDriver } from "./platform";
import {
  platformsAfterMultiStart,
  type SessionReuseReason,
  sessionReuseReason,
  startPlan,
} from "./reuse";

const API_READY_TIMEOUT_MS = 60_000;
const METRO_READY_TIMEOUT_MS = 120_000;
const APP_METRO_REQUEST_TIMEOUT_MS = 240_000;
// A cold first bundle regularly runs past two minutes. Trying the second
// scheme before then would put a "열까요?" dialog on a screen that was about to
// come up on its own.
const ALTERNATE_SCHEME_AFTER_MS = 180_000;
const BUILD_LOCK_TIMEOUT_MS = 60 * 60 * 1000;
const PLATFORMS: Platform[] = ["android", "ios"];

/**
 * Metro names the platform on every bundle line. Matching that name rather
 * than any bundle activity keeps one platform's work from standing in as
 * proof that the other platform's app came up.
 */
function appRequestPattern(platform: Platform): RegExp {
  return new RegExp(`${platform}\\s+bundl|platform=${platform}`, "i");
}

function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The session's own API or Metro died. This is never one platform's failure:
 * every platform loses its server, so it has to escape the per-platform
 * catches and fail the run.
 */
class SessionDiedError extends Error {}

export interface StartInput {
  clear: boolean;
  cwd: string;
  io: SessionIo;
  /** Ordered and de-duplicated; the order is the start order. */
  platforms: Platform[];
}

export type BuildOutcome = "built" | "installed" | "reused";

export interface PlatformSuccess {
  build: BuildOutcome;
  deviceId: string;
  platform: Platform;
}

export interface PlatformFailure {
  message: string;
  platform: Platform;
}

export interface StartResult {
  /** Every platform attached to this worktree's Metro once the command ends. */
  activePlatforms: Platform[];
  apiPort: number;
  /** Requested platforms that did not come up; the session itself lives on. */
  failures: PlatformFailure[];
  logDirectory: string;
  metroPort: number;
  slot: number;
  /** Requested platforms that attached, in start order. */
  successes: PlatformSuccess[];
}

interface SessionLogs {
  api: string;
  build: string;
  device: string;
  directory: string;
  metro: string;
}

function sessionLogs(context: SessionContext): SessionLogs {
  const directory = worktreeLogDirectory(
    context.paths,
    context.git.worktreePath
  );

  mkdirSync(directory, { recursive: true });

  return {
    api: join(directory, "api.log"),
    build: join(directory, "build.log"),
    device: join(directory, "device.log"),
    directory,
    metro: join(directory, "metro.log"),
  };
}

async function freePorts(): Promise<Set<number>> {
  const ports: number[] = [];

  for (let slot = 0; slot <= MAX_SLOT; slot += 1) {
    ports.push(metroPort(slot), apiPort(slot));
  }

  const results = await Promise.all(
    ports.map(async (port) => ({ free: await isPortFree(port), port }))
  );

  return new Set(
    results.filter((entry) => entry.free).map((entry) => entry.port)
  );
}

interface Allocation {
  /** Platforms already attached before this command, in their recorded order. */
  attached: Platform[];
  clearMetroCache: boolean;
  /** Requested platforms whose device could not be leased; the rest continue. */
  deviceFailures: PlatformFailure[];
  /** Every device this worktree holds, so a restart can reach the others. */
  devices: Partial<Record<Platform, string>>;
  /** What each held device carries, read under the lease's own lock. */
  installedFingerprints: Partial<Record<Platform, string | null>>;
  /** Devices other worktrees hold, per platform, so their names are left alone. */
  leasedElsewhere: Record<Platform, ReadonlySet<string>>;
  /** Pids of the reused API and Metro, empty when this run starts its own. */
  reusedPids: number[];
  /** This worktree's API and Metro are alive and still serve this session. */
  running: boolean;
  slot: number;
}

function sessionPids(record: WorktreeRecord): number[] {
  return [record.processes.api?.pid, record.processes.metro?.pid].filter(
    (pid): pid is number => pid !== undefined
  );
}

/** Devices leased to any other worktree, read under the same lock. */
function devicesLeasedElsewhere(
  state: RepositoryState,
  worktreePath: string
): Record<Platform, ReadonlySet<string>> {
  const found: Record<Platform, Set<string>> = {
    android: new Set(),
    ios: new Set(),
  };

  for (const platform of PLATFORMS) {
    for (const [deviceId, device] of Object.entries(
      state.devicePool[platform]
    )) {
      if (device.leasedTo && device.leasedTo !== worktreePath) {
        found[platform].add(deviceId);
      }
    }
  }

  return found;
}

/** What every device this worktree holds currently carries, per platform. */
function installedFingerprints(
  state: RepositoryState,
  devices: Partial<Record<Platform, string>>
): Partial<Record<Platform, string | null>> {
  const found: Partial<Record<Platform, string | null>> = {};

  for (const platform of PLATFORMS) {
    const deviceId = devices[platform];

    if (deviceId) {
      found[platform] =
        state.devicePool[platform][deviceId]?.installedFingerprint ?? null;
    }
  }

  return found;
}

async function ensureDevice(
  driver: PlatformDriver,
  state: RepositoryState,
  platform: Platform,
  context: SessionContext
): Promise<string> {
  const choice = selectDevice({
    platform,
    state,
    worktreePath: context.git.worktreePath,
  });

  if (choice.reason !== "create") {
    return choice.deviceId;
  }

  const taken = await driver.existingDeviceNames();
  const name = driver.nextDeviceName(context.project.slug, taken);

  return await driver.createDevice(name);
}

async function keepRunningSession(
  worktreePath: string,
  state: RepositoryState,
  io: SessionIo,
  reuseReason: SessionReuseReason,
  forceClear: boolean
): Promise<boolean> {
  if (forceClear && reuseReason === "reuse") {
    io.log("요청에 따라 API와 Metro를 다시 시작합니다.");
    await stopOwnProcesses(worktreePath, state);

    return false;
  }

  if (reuseReason === "metro-inputs-changed") {
    io.log("Metro 입력이 바뀌어 API와 Metro를 다시 시작합니다.");
    await stopOwnProcesses(worktreePath, state);

    return false;
  }

  if (reuseReason === "environment-changed") {
    io.log("개발 세션 환경이 바뀌어 API와 Metro를 다시 시작합니다.");
    await stopOwnProcesses(worktreePath, state);

    return false;
  }

  return reuseReason === "reuse";
}

/** Leases one device per requested platform; a failure skips that platform. */
async function leaseRequestedDevices(
  context: SessionContext,
  state: RepositoryState,
  drivers: ReadonlyMap<Platform, PlatformDriver>,
  platforms: readonly Platform[]
): Promise<PlatformFailure[]> {
  const failures: PlatformFailure[] = [];

  for (const platform of platforms) {
    const driver = drivers.get(platform);

    if (!driver) {
      continue;
    }

    try {
      // biome-ignore lint/performance/noAwaitInLoops: devices are leased one at a time under the same lock.
      const deviceId = await ensureDevice(driver, state, platform, context);

      leaseDevice(state, platform, deviceId, context.git.worktreePath);
    } catch (error) {
      // One platform without a device must not cost the other its start.
      failures.push({ message: failureMessage(error), platform });
    }
  }

  return failures;
}

/**
 * Reclaiming, the slot and the device assignments happen under one lock, so
 * two worktrees starting at the same moment cannot walk away with the same
 * slot or the same device.
 */
async function allocate(
  context: SessionContext,
  drivers: ReadonlyMap<Platform, PlatformDriver>,
  platforms: readonly Platform[],
  io: SessionIo,
  environmentFingerprintForSlot: (slot: number) => string,
  metroInputsCurrent: boolean,
  forceClear: boolean
): Promise<Allocation> {
  return await withLock(context.paths.lockDirectory, async () => {
    const { worktreePath } = context.git;
    let state = readState(context.paths.statePath);

    state = await fitStateToReality(context, state, io);

    const existing = state.worktrees[worktreePath];
    // Read before the restart decision: stopping the processes clears the list,
    // and those platforms are exactly the ones that have to be reopened.
    const attached = existing?.activePlatforms ?? [];
    const reuseReason = sessionReuseReason(
      existing,
      environmentFingerprintForSlot(existing?.slot ?? 0),
      metroInputsCurrent
    );
    const running = await keepRunningSession(
      worktreePath,
      state,
      io,
      reuseReason,
      forceClear
    );
    const free = await freePorts();
    const ownPorts = new Set(
      running
        ? [
            existing?.processes.api?.port,
            existing?.processes.metro?.port,
          ].filter((port): port is number => port !== undefined)
        : []
    );
    const { changed, slot } = allocateSlot({
      currentSlot: existing?.slot,
      isPortFree: (port) => free.has(port),
      ownPorts,
      takenSlots: new Set(
        Object.entries(state.worktrees)
          .filter(([path]) => path !== worktreePath)
          .map(([, record]) => record.slot)
      ),
    });

    if (changed && existing) {
      io.log(`저장된 slot의 포트가 사용 중이라 slot ${slot}으로 옮깁니다.`);
    }

    const worktree: WorktreeRecord = {
      activePlatforms: running ? attached : [],
      devices: existing?.devices ?? {},
      environmentFingerprint: existing?.environmentFingerprint ?? null,
      label: context.git.label,
      processes: existing?.processes ?? {},
      slot,
    };

    state.worktrees[worktreePath] = worktree;

    const deviceFailures = await leaseRequestedDevices(
      context,
      state,
      drivers,
      platforms
    );

    // A worktree that never had a record and could not lease a single device
    // does not get one now: a slot held by an empty record would show up in
    // `dev:status` and block other worktrees for nothing.
    if (!existing && Object.keys(worktree.devices).length === 0) {
      delete state.worktrees[worktreePath];
    }

    writeState(context.paths.statePath, state);

    const devices = { ...worktree.devices };

    return {
      // Kept even when the processes are restarting: these apps lost their
      // Metro and are the ones this run has to bring back.
      attached,
      clearMetroCache: forceClear || !metroInputsCurrent,
      deviceFailures,
      devices,
      installedFingerprints: installedFingerprints(state, devices),
      leasedElsewhere: devicesLeasedElsewhere(state, worktreePath),
      reusedPids: running ? sessionPids(worktree) : [],
      running,
      slot,
    };
  });
}

function updateState(
  context: SessionContext,
  change: (state: RepositoryState) => void
): Promise<void> {
  return withLock(context.paths.lockDirectory, () => {
    const state = readState(context.paths.statePath);

    change(state);
    writeState(context.paths.statePath, state);
  });
}

interface BuildStepInput {
  context: SessionContext;
  deviceTarget: string;
  driver: PlatformDriver;
  env: Record<string, string>;
  fingerprint: string;
  handle: DeviceHandle;
  installedFingerprint: string | null;
  io: SessionIo;
  logs: SessionLogs;
  platform: Platform;
}

async function installShared(
  driver: PlatformDriver,
  handle: DeviceHandle,
  artifactPath: string,
  io: SessionIo
): Promise<void> {
  io.log("저장소 공용 빌드를 설치합니다.");
  await driver.installArtifact(handle, artifactPath);
}

/**
 * Reuse what is on the device, then the repository's shared artifact, and
 * build only when neither exists. A second worktree asking for the same
 * fingerprint waits for the first build rather than starting its own.
 */
async function resolveBuild({
  context,
  deviceTarget,
  driver,
  env,
  fingerprint,
  handle,
  installedFingerprint,
  io,
  logs,
  platform,
}: BuildStepInput): Promise<BuildOutcome> {
  const directory = sharedBuildDirectory(context.paths, platform, fingerprint);
  const name = artifactName(platform, context.project.slug);
  const plan = planBuild({
    artifactPath: findSharedBuild(directory, name),
    fingerprint,
    installedFingerprint,
  });

  if (plan.action === "keep") {
    io.log("기기에 같은 fingerprint의 앱이 있어 빌드와 설치를 건너뜁니다.");

    return "reused";
  }

  if (plan.action === "install") {
    await installShared(driver, handle, plan.artifactPath, io);
    await updateState(context, (next) => {
      recordInstalledFingerprint(next, platform, handle.deviceId, fingerprint);
    });

    return "installed";
  }

  // The lock sits beside the artifact directory rather than inside it, so a
  // build that fails leaves nothing behind that looks like a shared entry.
  return await withLock(
    `${directory}.lock`,
    async () => {
      const ready = findSharedBuild(directory, name);

      if (ready) {
        await installShared(driver, handle, ready, io);
        await updateState(context, (next) => {
          recordInstalledFingerprint(
            next,
            platform,
            handle.deviceId,
            fingerprint
          );
        });

        return "installed" as const;
      }

      io.log(
        `Development Build를 만듭니다. 처음 한 번은 오래 걸립니다. 진행 상황: ${logs.build}`
      );
      await runDevBuild({
        device: deviceTarget,
        env: driver.buildEnv(env),
        logPath: logs.build,
        mobileDirectory: context.mobileDirectory,
        platform,
      });

      const produced = await driver.producedArtifact(handle);

      if (!produced) {
        throw new Error(
          `빌드 결과물을 찾지 못했습니다. ${logs.build}를 확인해 주세요.`
        );
      }

      // Only a finished build becomes reusable, so a failure above leaves the
      // shared entry and the device fingerprint untouched.
      storeSharedBuild(directory, produced, name);
      await updateState(context, (next) => {
        recordInstalledFingerprint(
          next,
          platform,
          handle.deviceId,
          fingerprint
        );
      });

      return "built" as const;
    },
    { timeoutMs: BUILD_LOCK_TIMEOUT_MS }
  );
}

interface OpenAppInput {
  context: SessionContext;
  driver: PlatformDriver;
  handle: DeviceHandle;
  logs: SessionLogs;
  metro: number;
  platform: Platform;
  running: () => void;
}

/**
 * The app's own request arriving at this worktree's Metro proves that the
 * development client opened the intended session. Bundle success is a
 * separate runtime result and does not control Metro cache bookkeeping.
 */
async function openApp({
  context,
  driver,
  handle,
  logs,
  metro,
  platform,
  running,
}: OpenAppInput): Promise<void> {
  const pattern = appRequestPattern(platform);
  const since = fileSize(logs.metro);

  await driver.relaunchUrl(
    handle,
    developmentClientUrl(context.project.scheme, metro)
  );

  const opened = await waitForLogMatch({
    check: running,
    logPath: logs.metro,
    pattern,
    since,
    timeoutMs: ALTERNATE_SCHEME_AFTER_MS,
  });

  if (opened) {
    return;
  }

  // The development client also answers `exp+<slug>`; which scheme a build
  // registers depends on how it was made, so the second one is tried before
  // giving up on the app.
  await driver.relaunchUrl(
    handle,
    developmentClientUrl(`exp+${context.project.slug}`, metro)
  );

  const openedAlternate = await waitForLogMatch({
    check: running,
    logPath: logs.metro,
    pattern,
    since,
    timeoutMs: APP_METRO_REQUEST_TIMEOUT_MS - ALTERNATE_SCHEME_AFTER_MS,
  });

  if (!openedAlternate) {
    throw new Error(
      `${platform} 앱이 Metro에 연결되지 않았습니다. ${logs.metro}와 기기 화면을 확인해 주세요.`
    );
  }
}

interface ReopenInput {
  attached: Platform[];
  context: SessionContext;
  devices: Partial<Record<Platform, string>>;
  env: Record<string, string>;
  installedFingerprints: Partial<Record<Platform, string | null>>;
  io: SessionIo;
  leasedElsewhere: Record<Platform, ReadonlySet<string>>;
  logs: SessionLogs;
  metro: number;
  /** Platforms this command already opened or reported on its own. */
  requested: ReadonlySet<Platform>;
  running: () => void;
  slot: number;
}

/**
 * Restarting API and Metro drops every app that was attached, not only the
 * ones this command names. Each of the others goes back to the new Metro so
 * the command leaves every platform ready to verify. Reconnecting opens the
 * build already installed on that device; it never starts a native build for
 * a platform the command did not ask for.
 */
async function reopenOtherPlatforms({
  attached,
  context,
  devices,
  env,
  installedFingerprints: installed,
  io,
  leasedElsewhere,
  logs,
  metro,
  requested,
  running,
  slot,
}: ReopenInput): Promise<Platform[]> {
  const reattached: Platform[] = [];

  for (const platform of attached) {
    const deviceId = devices[platform];

    if (requested.has(platform) || !deviceId) {
      continue;
    }

    // biome-ignore lint/performance/noAwaitInLoops: each platform's fingerprint reads its own native inputs.
    const current = await generateFingerprint(
      context.mobileDirectory,
      platform,
      env
    );

    // Reconnecting opens whatever that device already carries. When the native
    // inputs moved past it, saying so beats handing back an app that will fail
    // at runtime under a session this command reported as ready.
    if (installed[platform] !== current) {
      io.log(
        `${platform} 앱은 네이티브 입력이 달라져 다시 연결하지 않습니다. bun run dev ${platform}로 새 빌드를 만들어 주세요.`
      );
      continue;
    }

    io.log(`${platform} 앱도 새 Metro에 다시 연결합니다.`);

    const driver = driverFor(context, platform);

    try {
      const handle = await driver.ensureBooted({
        deviceId,
        leasedElsewhere: leasedElsewhere[platform],
        logPath: logs.device,
        slot,
      });

      await driver.prepareForMetro(handle, metro);
      await openApp({
        context,
        driver,
        handle,
        logs,
        metro,
        platform,
        running,
      });
      reattached.push(platform);
    } catch (error) {
      if (error instanceof SessionDiedError) {
        throw error;
      }

      // One platform that cannot come back must not undo the platform that
      // did. The state below then records only what is really attached.
      io.log(
        `  ${platform} 앱을 다시 연결하지 못했습니다. bun run dev ${platform}로 다시 시도해 주세요. (${failureMessage(error)})`
      );
    }
  }

  return reattached;
}

interface SessionSetup {
  allocation: Allocation;
  context: SessionContext;
  drivers: ReadonlyMap<Platform, PlatformDriver>;
  env: Record<string, string>;
  failures: PlatformFailure[];
  io: SessionIo;
  logs: SessionLogs;
  metro: number;
  /** Requested platforms that hold a leased device, in start order. */
  startable: Platform[];
  watch: (pids: readonly number[]) => () => void;
}

/**
 * The session is alive and its addresses are unchanged, so each requested
 * platform only has to reach it: an attached platform reopens its app, a new
 * one resolves its build first and joins. A build here runs under the live
 * Metro; the open follow-up on that path applies to joins, not fresh starts.
 */
async function startOnRunningSession(setup: SessionSetup): Promise<{
  attachedNow: Platform[];
  failedNow: Platform[];
  successes: PlatformSuccess[];
}> {
  const {
    allocation,
    context,
    drivers,
    env,
    failures,
    io,
    logs,
    metro,
    startable,
    watch,
  } = setup;
  const running = watch(allocation.reusedPids);
  const attachedNow: Platform[] = [];
  const failedNow: Platform[] = [];
  const successes: PlatformSuccess[] = [];

  for (const platform of startable) {
    const driver = drivers.get(platform);
    const deviceId = allocation.devices[platform];

    if (!(driver && deviceId)) {
      continue;
    }

    const plan = startPlan({
      attached: allocation.attached,
      platform,
      running: true,
    });

    try {
      let build: BuildOutcome = "reused";
      let handle: DeviceHandle;

      if (plan === "join") {
        io.log(`실행 중인 세션에 ${platform}를 더합니다.`);

        // biome-ignore lint/performance/noAwaitInLoops: platforms start in the order the command names them.
        const booted = await bootWithFingerprint(
          setup,
          platform,
          driver,
          deviceId
        );

        ({ handle } = booted);
        build = await resolveBuild({
          context,
          deviceTarget: driver.buildTarget(handle),
          driver,
          env,
          fingerprint: booted.fingerprint,
          handle,
          installedFingerprint:
            allocation.installedFingerprints[platform] ?? null,
          io,
          logs,
          platform,
        });
      } else {
        io.log(
          `이미 실행 중인 세션을 그대로 두고 ${platform} 앱만 다시 엽니다.`
        );
        handle = await driver.ensureBooted({
          deviceId,
          leasedElsewhere: allocation.leasedElsewhere[platform],
          logPath: logs.device,
          slot: allocation.slot,
        });
      }

      await driver.prepareForMetro(handle, metro);
      await openApp({
        context,
        driver,
        handle,
        logs,
        metro,
        platform,
        running,
      });
      attachedNow.push(platform);
      successes.push({ build, deviceId, platform });
    } catch (error) {
      if (error instanceof SessionDiedError) {
        throw error;
      }

      // The session and any platform that already attached stay up.
      failures.push({ message: failureMessage(error), platform });
      failedNow.push(platform);
    }
  }

  // A death between the last open and here would otherwise be reported as a
  // ready session.
  running();

  return { attachedNow, failedNow, successes };
}

interface BootedPlatform {
  deviceId: string;
  driver: PlatformDriver;
  fingerprint: string;
  handle: DeviceHandle;
  platform: Platform;
}

interface PreparedPlatform extends Omit<BootedPlatform, "fingerprint"> {
  build: BuildOutcome;
}

/**
 * Boots the device and computes the native fingerprint for one platform at
 * the same time; the fingerprint reads no device, so neither waits for the
 * other. Both outcomes are always observed: a fingerprint that fails fast must
 * not leave a boot in flight with nobody to report it, and when both fail the
 * boot's own error is reported alongside rather than hidden.
 */
async function bootWithFingerprint(
  setup: SessionSetup,
  platform: Platform,
  driver: PlatformDriver,
  deviceId: string
): Promise<BootedPlatform> {
  const { allocation, context, env, io, logs } = setup;
  const [boot, fingerprint] = await Promise.allSettled([
    driver.ensureBooted({
      deviceId,
      leasedElsewhere: allocation.leasedElsewhere[platform],
      logPath: logs.device,
      slot: allocation.slot,
    }),
    generateFingerprint(context.mobileDirectory, platform, env),
  ]);
  const problems = [boot, fingerprint]
    .filter(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    )
    .map((result) => failureMessage(result.reason));

  if (boot.status === "rejected" || fingerprint.status === "rejected") {
    throw new Error(problems.join("\n"));
  }

  io.log(`${platform} native fingerprint: ${fingerprint.value}`);

  return {
    deviceId,
    driver,
    fingerprint: fingerprint.value,
    handle: boot.value,
    platform,
  };
}

/**
 * Everything native happens here, before any session process exists: devices
 * boot and builds resolve while no Metro of this worktree is alive to watch
 * the project churn underneath it. Every platform's boot and fingerprint start
 * at once, so an emulator's cold boot overlaps the other platform's work; each
 * platform then builds as soon as its own preparation is done, in the order
 * the command named them, because both builds write into `apps/mobile`.
 */
async function prepareFreshPlatforms(
  setup: SessionSetup
): Promise<PreparedPlatform[]> {
  const { allocation, context, drivers, env, failures, io, logs, startable } =
    setup;
  const preparations = startable.map((platform) => {
    const driver = drivers.get(platform);
    const deviceId = allocation.devices[platform];

    return {
      platform,
      // Started here so every boot is already under way before the first
      // build; the rejection is consumed in order below, never left dangling.
      ready:
        driver && deviceId
          ? bootWithFingerprint(setup, platform, driver, deviceId)
          : Promise.reject(new Error("배정된 기기가 없습니다.")),
    };
  });
  const prepared: PreparedPlatform[] = [];

  for (const { platform, ready } of preparations) {
    try {
      // biome-ignore lint/performance/noAwaitInLoops: platforms build one at a time, in the order the command names them.
      const entry = await ready;
      // The device may have gone away while another platform was building;
      // Android in particular is addressed by a serial that a relaunch changes.
      const handle = await entry.driver.ensureBooted({
        deviceId: entry.deviceId,
        leasedElsewhere: allocation.leasedElsewhere[platform],
        logPath: logs.device,
        slot: allocation.slot,
      });
      const build = await resolveBuild({
        context,
        deviceTarget: entry.driver.buildTarget(handle),
        driver: entry.driver,
        env,
        fingerprint: entry.fingerprint,
        handle,
        installedFingerprint:
          allocation.installedFingerprints[platform] ?? null,
        io,
        logs,
        platform,
      });

      prepared.push({
        build,
        deviceId: entry.deviceId,
        driver: entry.driver,
        handle,
        platform,
      });
    } catch (error) {
      // The other requested platform still gets its session.
      failures.push({ message: failureMessage(error), platform });
    }
  }

  return prepared;
}

function aggregateFailure(
  lead: string,
  failures: readonly PlatformFailure[]
): Error {
  return new Error(
    [
      lead,
      ...failures.map(
        (failure) => `  - ${failure.platform}: ${failure.message}`
      ),
    ].join("\n")
  );
}

export async function startSession({
  clear,
  cwd,
  io,
  platforms,
}: StartInput): Promise<StartResult> {
  const context = await createSessionContext(cwd);
  const failures: PlatformFailure[] = [];
  const drivers = new Map<Platform, PlatformDriver>();
  const toolingChecks = await Promise.all(
    platforms.map(async (platform) => {
      const driver = driverFor(context, platform);

      try {
        return { driver, missing: await driver.missingTooling(), platform };
      } catch (error) {
        // A tooling probe that itself fails is that platform's problem, not
        // a reason to abandon the other platform.
        return {
          driver,
          missing: [`도구 확인에 실패했습니다: ${failureMessage(error)}`],
          platform,
        };
      }
    })
  );

  for (const check of toolingChecks) {
    if (check.missing.length > 0) {
      failures.push({
        message: `${check.platform} 개발에 필요한 도구가 없습니다. 아래를 설치한 뒤 다시 실행해 주세요.\n${check.missing.map((item) => `  - ${item}`).join("\n")}`,
        platform: check.platform,
      });
    } else {
      drivers.set(check.platform, check.driver);
    }
  }

  if (drivers.size === 0) {
    throw new Error(failures.map((failure) => failure.message).join("\n\n"));
  }

  await requireSupabase(context);

  const fileValues = readMobileEnvFile(context);

  // The two dynamic ports are replaced again once the slot is known; this
  // pass exists so a missing key fails before any device or process starts.
  const mobileEnvironmentForSlot = (slot: number) =>
    buildMobileEnvironment({
      fileValues,
      ports: { api: apiPort(slot), supabase: context.supabasePort },
    });

  mobileEnvironmentForSlot(0);

  const logs = sessionLogs(context);
  const metroCache = worktreeMetroPaths(
    context.paths,
    context.git.worktreePath
  );
  const currentMetroInputFingerprint = metroInputFingerprint(
    context.git.worktreePath
  );
  const previousMetroInputFingerprint = readMetroInputFingerprint(
    metroCache.fingerprintPath
  );
  const runnable = platforms.filter((platform) => drivers.has(platform));
  const allocation = await allocate(
    context,
    drivers,
    runnable,
    io,
    (slot) => mobileEnvironmentFingerprint(mobileEnvironmentForSlot(slot)),
    previousMetroInputFingerprint === currentMetroInputFingerprint,
    clear
  );

  failures.push(...allocation.deviceFailures);

  const startable = runnable.filter(
    (platform) => allocation.devices[platform] !== undefined
  );

  if (startable.length === 0) {
    throw aggregateFailure(
      "요청한 플랫폼을 하나도 시작하지 못했습니다.",
      failures
    );
  }

  const metro = metroPort(allocation.slot);
  const api = apiPort(allocation.slot);
  const mobileEnvironment = mobileEnvironmentForSlot(allocation.slot);
  const environmentFingerprint =
    mobileEnvironmentFingerprint(mobileEnvironment);
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    ...mobileEnvironment,
  };
  // A build or a first bundle can run for many minutes; whichever processes
  // this run depends on are checked throughout rather than at the end, so a
  // session that died is reported as that instead of as an unresponsive app.
  const watch = (pids: readonly number[]) => () => {
    for (const pid of pids) {
      if (!isProcessAlive(pid)) {
        throw new SessionDiedError(
          `개발 세션 프로세스가 종료됐습니다. ${logs.api}와 ${logs.metro}를 확인해 주세요.`
        );
      }
    }
  };
  const setup: SessionSetup = {
    allocation,
    context,
    drivers,
    env,
    failures,
    io,
    logs,
    metro,
    startable,
    watch,
  };

  if (allocation.running) {
    const { attachedNow, failedNow, successes } =
      await startOnRunningSession(setup);
    const activePlatforms = platformsAfterMultiStart({
      attached: allocation.attached,
      attachedNow,
      failedNow,
      running: true,
    });

    // Written even when nothing attached: a relaunch that failed quit its app
    // first, so the record must stop calling that platform attached.
    await updateState(context, (state) => {
      const record = state.worktrees[context.git.worktreePath];

      if (record) {
        record.activePlatforms = activePlatforms;
      }
    });

    if (attachedNow.length === 0) {
      throw aggregateFailure(
        "요청한 플랫폼의 앱을 하나도 열지 못했습니다. 실행 중이던 세션은 그대로 둡니다.",
        failures
      );
    }

    return {
      activePlatforms,
      apiPort: api,
      failures,
      logDirectory: logs.directory,
      metroPort: metro,
      slot: allocation.slot,
      successes,
    };
  }

  // Everything native for every requested platform completes here, before the
  // session's own Metro exists.
  const prepared = await prepareFreshPlatforms(setup);

  if (prepared.length === 0) {
    throw aggregateFailure(
      "요청한 플랫폼을 하나도 시작하지 못했습니다.",
      failures
    );
  }

  const started: number[] = [];

  try {
    // Not `bun run --cwd apps/api dev`: that script pins `BUN_PORT` inline,
    // which would put every worktree's API back on the same port.
    const apiPid = spawnSession({
      argv: [
        process.execPath,
        "--hot",
        join(context.apiDirectory, "src", "index.ts"),
      ],
      cwd: context.apiDirectory,
      env: { ...env, BUN_PORT: String(api) },
      logPath: logs.api,
    });

    started.push(apiPid);

    mkdirSync(metroCache.tmpDirectory, { recursive: true });

    const metroArguments = [
      join(context.mobileDirectory, "node_modules", ".bin", "expo"),
      "start",
      "--dev-client",
      "--port",
      String(metro),
    ];

    if (allocation.clearMetroCache) {
      io.log("이 worktree의 Metro 캐시를 초기화합니다.");
      metroArguments.push("--clear");
    }

    const metroPid = spawnSession({
      argv: metroArguments,
      cwd: context.mobileDirectory,
      env: { ...env, TMPDIR: metroCache.tmpDirectory },
      logPath: logs.metro,
    });

    started.push(metroPid);

    const running = watch(started);

    await waitForHttp({
      accepts: (body) => body.includes('"ok"'),
      check: running,
      timeoutMs: API_READY_TIMEOUT_MS,
      url: `http://127.0.0.1:${api}/health`,
    });
    io.log(`API가 응답합니다: http://127.0.0.1:${api}`);

    await waitForHttp({
      accepts: (body) => body.includes("packager-status:running"),
      check: running,
      timeoutMs: METRO_READY_TIMEOUT_MS,
      url: `http://127.0.0.1:${metro}/status`,
    });
    io.log(`Metro가 응답합니다: http://127.0.0.1:${metro}`);

    // This marker means Metro reached ready state after applying the requested
    // cache reset for these inputs. App launch and bundle errors are separate.
    writeMetroInputFingerprint(
      metroCache.fingerprintPath,
      currentMetroInputFingerprint
    );

    const attachedNow: Platform[] = [];
    const successes: PlatformSuccess[] = [];

    for (const entry of prepared) {
      try {
        // biome-ignore lint/performance/noAwaitInLoops: platforms open in the order the command names them.
        await entry.driver.prepareForMetro(entry.handle, metro);
        await openApp({
          context,
          driver: entry.driver,
          handle: entry.handle,
          logs,
          metro,
          platform: entry.platform,
          running,
        });
        attachedNow.push(entry.platform);
        successes.push({
          build: entry.build,
          deviceId: entry.deviceId,
          platform: entry.platform,
        });
      } catch (error) {
        if (error instanceof SessionDiedError) {
          throw error;
        }

        // A platform that fails to open must not take down the session the
        // other platform is already attached to.
        failures.push({
          message: failureMessage(error),
          platform: entry.platform,
        });
      }
    }

    if (attachedNow.length === 0) {
      throw aggregateFailure(
        "요청한 플랫폼의 앱을 하나도 열지 못했습니다.",
        failures
      );
    }

    const reattached = await reopenOtherPlatforms({
      attached: allocation.attached,
      context,
      devices: allocation.devices,
      env,
      installedFingerprints: allocation.installedFingerprints,
      io,
      leasedElsewhere: allocation.leasedElsewhere,
      logs,
      metro,
      requested: new Set(platforms),
      running,
      slot: allocation.slot,
    });

    // A reconnect that failed is reported rather than thrown, so the session's
    // own processes are confirmed once more before this run claims success.
    running();

    const activePlatforms = platformsAfterMultiStart({
      attached: allocation.attached,
      attachedNow,
      reattached,
      running: false,
    });

    await updateState(context, (state) => {
      const record = state.worktrees[context.git.worktreePath];

      if (record) {
        record.activePlatforms = activePlatforms;
        record.environmentFingerprint = environmentFingerprint;
        record.processes = {
          api: { logPath: logs.api, pid: apiPid, port: api },
          metro: { logPath: logs.metro, pid: metroPid, port: metro },
        };
      }
    });

    return {
      activePlatforms,
      apiPort: api,
      failures,
      logDirectory: logs.directory,
      metroPort: metro,
      slot: allocation.slot,
      successes,
    };
  } catch (error) {
    // Only what this run started is stopped. The slot, the device assignments
    // and any sound shared build stay exactly as they were. A per-platform
    // open failure is reported through `failures` instead of arriving here.
    await Promise.all(started.map((pid) => stopProcess(pid)));

    throw error;
  }
}
