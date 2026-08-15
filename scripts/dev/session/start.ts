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
import { type SessionReuseReason, sessionReuseReason } from "./reuse";

const API_READY_TIMEOUT_MS = 60_000;
const METRO_READY_TIMEOUT_MS = 120_000;
const BUNDLE_TIMEOUT_MS = 240_000;
// A cold first bundle regularly runs past two minutes. Trying the second
// scheme before then would put a "열까요?" dialog on a screen that was about to
// come up on its own.
const ALTERNATE_SCHEME_AFTER_MS = 180_000;
const BUILD_LOCK_TIMEOUT_MS = 60 * 60 * 1000;
const BUNDLE_PATTERN = /(ios|android)\s+bundl|index\.bundle/i;

export interface StartInput {
  clear: boolean;
  cwd: string;
  io: SessionIo;
  platform: Platform;
}

export interface StartResult {
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
  clearMetroCache: boolean;
  deviceId: string;
  /** What the leased device carries, read under the lease's own lock. */
  installedFingerprint: string | null;
  /** The same platform is already running here; nothing needs starting. */
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
    const reuseReason = sessionReuseReason(
      existing,
      platform,
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

    if (existing?.activePlatform && existing.activePlatform !== platform) {
      io.log(
        `${existing.activePlatform} 세션을 종료하고 ${platform}으로 전환합니다.`
      );

      const otherDevice = existing.devices[existing.activePlatform];

      await stopOwnProcesses(worktreePath, state);

      if (otherDevice) {
        const otherDriver = driverFor(context, existing.activePlatform);

        await otherDriver.shutdown(otherDevice);
      }
    }

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
      activePlatform: existing?.activePlatform ?? null,
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
      clearMetroCache: forceClear || !metroInputsCurrent,
      deviceId,
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

interface OpenAppInput {
  context: SessionContext;
  driver: PlatformDriver;
  handle: { deviceId: string; target: string };
  logs: SessionLogs;
  metro: number;
  running: () => void;
}

/**
 * The command must not report success before the app is up, and the only
 * honest evidence of that is the app's own request arriving at this worktree's
 * Metro.
 */
async function openApp({
  context,
  driver,
  handle,
  logs,
  metro,
  running,
}: OpenAppInput): Promise<void> {
  const since = fileSize(logs.metro);

  await driver.relaunchUrl(
    handle,
    developmentClientUrl(context.project.scheme, metro)
  );

  const opened = await waitForLogMatch({
    check: running,
    logPath: logs.metro,
    pattern: BUNDLE_PATTERN,
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
    pattern: BUNDLE_PATTERN,
    since,
    timeoutMs: BUNDLE_TIMEOUT_MS - ALTERNATE_SCHEME_AFTER_MS,
  });

  if (!openedAlternate) {
    throw new Error(
      `앱이 Metro에 연결되지 않았습니다. ${logs.metro}와 기기 화면을 확인해 주세요.`
    );
  }
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
      addresses: sessionAddresses(
        platform,
        apiPort(slot),
        context.supabasePort
      ),
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

  try {
    const handle = await driver.ensureBooted({
      deviceId: allocation.deviceId,
      logPath: logs.device,
      slot: allocation.slot,
    });

    if (allocation.running) {
      io.log("이미 실행 중인 세션을 그대로 두고 앱만 다시 엽니다.");
      await driver.prepareForMetro(handle, metro);
      await openApp({
        context,
        driver,
        handle,
        logs,
        metro,
        running: () => undefined,
      });

      return {
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

    await driver.prepareForMetro(handle, metro);
    await openApp({ context, driver, handle, logs, metro, running });

    writeMetroInputFingerprint(
      metroCache.fingerprintPath,
      currentMetroInputFingerprint
    );

    await updateState(context, (state) => {
      const record = state.worktrees[context.git.worktreePath];

      if (record) {
        record.activePlatform = platform;
        record.environmentFingerprint = environmentFingerprint;
        record.processes = {
          api: { logPath: logs.api, pid: apiPid, port: api },
          metro: { logPath: logs.metro, pid: metroPid, port: metro },
        };
      }
    });

    return {
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
