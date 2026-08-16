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
  sessionAddresses,
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
import { type RepositoryState, readState, writeState } from "../state";
import {
  createSessionContext,
  readMobileEnvFile,
  requireSupabase,
  type SessionContext,
  type SessionIo,
} from "./context";
import { fitStateToReality, stopOwnProcesses } from "./maintenance";
import { driverFor, type PlatformDriver } from "./platform";
import {
  platformsAfterStart,
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

/**
 * Metro names the platform on every bundle line. Matching that name rather
 * than any bundle activity keeps one platform's work from standing in as
 * proof that the other platform's app came up.
 */
function appRequestPattern(platform: Platform): RegExp {
  return new RegExp(`${platform}\\s+bundl|platform=${platform}`, "i");
}

export interface StartInput {
  clear: boolean;
  cwd: string;
  io: SessionIo;
  platform: Platform;
}

export interface StartResult {
  /** Every platform attached to this worktree's Metro once the command ends. */
  activePlatforms: Platform[];
  apiPort: number;
  build: "built" | "installed" | "reused";
  deviceId: string;
  logDirectory: string;
  metroPort: number;
  platform: Platform;
  slot: number;
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
  deviceId: string;
  /** Every device this worktree holds, so a restart can reach the others. */
  devices: Partial<Record<Platform, string>>;
  /** What the leased device carries, read under the lease's own lock. */
  installedFingerprint: string | null;
  /** This worktree's API and Metro are alive and still serve this session. */
  running: boolean;
  slot: number;
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

/**
 * Reclaiming, the slot and the device assignment happen under one lock, so two
 * worktrees starting at the same moment cannot walk away with the same slot or
 * the same device.
 */
async function allocate(
  context: SessionContext,
  driver: PlatformDriver,
  platform: Platform,
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

    state.worktrees[worktreePath] = {
      activePlatforms: running ? attached : [],
      devices: existing?.devices ?? {},
      environmentFingerprint: existing?.environmentFingerprint ?? null,
      label: context.git.label,
      processes: existing?.processes ?? {},
      slot,
    };

    const deviceId = await ensureDevice(driver, state, platform, context);

    leaseDevice(state, platform, deviceId, worktreePath);
    writeState(context.paths.statePath, state);

    return {
      // Kept even when the processes are restarting: these apps lost their
      // Metro and are the ones this run has to bring back.
      attached,
      clearMetroCache: forceClear || !metroInputsCurrent,
      deviceId,
      devices: { ...state.worktrees[worktreePath]?.devices },
      installedFingerprint:
        state.devicePool[platform][deviceId]?.installedFingerprint ?? null,
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
  handle: { deviceId: string; target: string };
  installedFingerprint: string | null;
  io: SessionIo;
  logs: SessionLogs;
  platform: Platform;
}

async function installShared(
  driver: PlatformDriver,
  handle: { deviceId: string; target: string },
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
}: BuildStepInput): Promise<StartResult["build"]> {
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

interface ReopenInput {
  attached: Platform[];
  context: SessionContext;
  devices: Partial<Record<Platform, string>>;
  hostPorts: number[];
  io: SessionIo;
  logs: SessionLogs;
  metro: number;
  opened: Platform;
  running: () => void;
  slot: number;
}

interface OpenAppInput {
  context: SessionContext;
  driver: PlatformDriver;
  handle: { deviceId: string; target: string };
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

/**
 * Restarting API and Metro drops every app that was attached, not only the one
 * this command names. Each of the others goes back to the new Metro so the
 * command leaves both platforms ready to verify. Reconnecting opens the build
 * already installed on that device; it never starts a native build for a
 * platform the command did not ask for.
 */
async function reopenOtherPlatforms({
  attached,
  context,
  devices,
  hostPorts,
  io,
  logs,
  metro,
  opened,
  running,
  slot,
}: ReopenInput): Promise<Platform[]> {
  const reattached: Platform[] = [];

  for (const platform of attached) {
    const deviceId = devices[platform];

    if (platform === opened || !deviceId) {
      continue;
    }

    io.log(`${platform} 앱도 새 Metro에 다시 연결합니다.`);

    const driver = driverFor(context, platform);

    try {
      // biome-ignore lint/performance/noAwaitInLoops: the device tools contend with each other when driven in parallel.
      const handle = await driver.ensureBooted({
        deviceId,
        logPath: logs.device,
        slot,
      });

      await driver.prepareHostPorts(handle, hostPorts);
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
      // One platform that cannot come back must not undo the platform that
      // did. The state below then records only what is really attached.
      io.log(
        `  ${platform} 앱을 다시 연결하지 못했습니다. bun run dev ${platform}로 다시 시도해 주세요. (${error instanceof Error ? error.message : String(error)})`
      );
    }
  }

  return reattached;
}

export async function startSession({
  clear,
  cwd,
  io,
  platform,
}: StartInput): Promise<StartResult> {
  const context = await createSessionContext(cwd);
  const driver = driverFor(context, platform);
  const missing = await driver.missingTooling();

  if (missing.length > 0) {
    throw new Error(
      `${platform} 개발에 필요한 도구가 없습니다. 아래를 설치한 뒤 다시 실행해 주세요.\n${missing.map((item) => `  - ${item}`).join("\n")}`
    );
  }

  await requireSupabase(context);

  const fileValues = readMobileEnvFile(context);

  // The two dynamic addresses are replaced again once the slot is known; this
  // pass exists so a missing key fails before any device or process starts.
  const mobileEnvironmentForSlot = (slot: number) =>
    buildMobileEnvironment({
      addresses: sessionAddresses(apiPort(slot), context.supabasePort),
      fileValues,
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
  const allocation = await allocate(
    context,
    driver,
    platform,
    io,
    (slot) => mobileEnvironmentFingerprint(mobileEnvironmentForSlot(slot)),
    previousMetroInputFingerprint === currentMetroInputFingerprint,
    clear
  );
  const metro = metroPort(allocation.slot);
  const api = apiPort(allocation.slot);
  const mobileEnvironment = mobileEnvironmentForSlot(allocation.slot);
  const environmentFingerprint =
    mobileEnvironmentFingerprint(mobileEnvironment);
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    ...mobileEnvironment,
  };
  const started: number[] = [];
  // Every address the app uses is `127.0.0.1`, so an emulator needs all three
  // forwarded before it can reach this worktree's session.
  const hostPorts = [metro, api, context.supabasePort];
  const plan = startPlan({
    attached: allocation.attached,
    platform,
    running: allocation.running,
  });

  try {
    const handle = await driver.ensureBooted({
      deviceId: allocation.deviceId,
      logPath: logs.device,
      slot: allocation.slot,
    });

    if (plan === "relaunch") {
      io.log("이미 실행 중인 세션을 그대로 두고 앱만 다시 엽니다.");
      await driver.prepareHostPorts(handle, hostPorts);
      await openApp({
        context,
        driver,
        handle,
        logs,
        metro,
        platform,
        running: () => undefined,
      });

      return {
        activePlatforms: platformsAfterStart(
          plan,
          allocation.attached,
          platform
        ),
        apiPort: api,
        build: "reused",
        deviceId: allocation.deviceId,
        logDirectory: logs.directory,
        metroPort: metro,
        platform,
        slot: allocation.slot,
      };
    }

    const fingerprint = await generateFingerprint(
      context.mobileDirectory,
      platform,
      env
    );

    io.log(`native fingerprint: ${fingerprint}`);

    const build = await resolveBuild({
      context,
      deviceTarget: driver.buildTarget(handle),
      driver,
      env,
      fingerprint,
      handle,
      installedFingerprint: allocation.installedFingerprint,
      io,
      logs,
      platform,
    });

    if (plan === "join") {
      io.log(`실행 중인 세션에 ${platform}을 더합니다.`);
      await driver.prepareHostPorts(handle, hostPorts);
      await openApp({
        context,
        driver,
        handle,
        logs,
        metro,
        platform,
        running: () => undefined,
      });

      const joined = platformsAfterStart(plan, allocation.attached, platform);

      await updateState(context, (state) => {
        const record = state.worktrees[context.git.worktreePath];

        if (record) {
          record.activePlatforms = joined;
        }
      });

      return {
        activePlatforms: joined,
        apiPort: api,
        build,
        deviceId: allocation.deviceId,
        logDirectory: logs.directory,
        metroPort: metro,
        platform,
        slot: allocation.slot,
      };
    }

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

    const running = () => {
      for (const pid of started) {
        if (!isProcessAlive(pid)) {
          throw new Error(
            `개발 세션 프로세스가 종료됐습니다. ${logs.api}와 ${logs.metro}를 확인해 주세요.`
          );
        }
      }
    };

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

    await driver.prepareHostPorts(handle, hostPorts);
    await openApp({ context, driver, handle, logs, metro, platform, running });

    const reattached = await reopenOtherPlatforms({
      attached: allocation.attached,
      context,
      devices: allocation.devices,
      hostPorts,
      io,
      logs,
      metro,
      opened: platform,
      running,
      slot: allocation.slot,
    });

    // A reconnect that failed is reported rather than thrown, so the session's
    // own processes are confirmed once more before this run claims success.
    running();

    const activePlatforms = platformsAfterStart(
      plan,
      allocation.attached,
      platform,
      reattached
    );

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
      build,
      deviceId: allocation.deviceId,
      logDirectory: logs.directory,
      metroPort: metro,
      platform,
      slot: allocation.slot,
    };
  } catch (error) {
    // Only what this run started is stopped. The slot, the device assignment
    // and any sound shared build stay exactly as they were.
    await Promise.all(started.map((pid) => stopProcess(pid)));

    throw error;
  }
}
