import { rmSync } from "node:fs";
import { releaseDevice } from "../devices";
import { withLock } from "../lock";
import type { Platform } from "../options";
import { worktreeLogDirectory } from "../paths";
import { type RepositoryState, readState, writeState } from "../state";
import {
  createSessionContext,
  type SessionContext,
  type SessionIo,
} from "./context";
import { fitStateToReality, stopOwnProcesses } from "./maintenance";
import { createPlatformDriver } from "./platform";

const PLATFORMS: Platform[] = ["android", "ios"];

export interface StopInput {
  cwd: string;
  io: SessionIo;
}

export interface StopResult {
  hadSession: boolean;
}

function driverFor(context: SessionContext, platform: Platform) {
  return createPlatformDriver({
    androidPackage: context.project.androidPackage,
    bundleIdentifier: context.project.bundleIdentifier,
    mobileDirectory: context.mobileDirectory,
    platform,
  });
}

/**
 * Shuts down the device the session was running on. The assignment, the
 * installed app and the signed-in session stay, so the next start picks up
 * where this one left off.
 */
async function shutdownActiveDevice(
  context: SessionContext,
  state: RepositoryState,
  platform: Platform | null
): Promise<void> {
  const deviceId = platform
    ? state.worktrees[context.git.worktreePath]?.devices[platform]
    : undefined;

  if (platform && deviceId) {
    await driverFor(context, platform).shutdown(deviceId);
  }
}

export async function stopSession({ cwd, io }: StopInput): Promise<StopResult> {
  const context = await createSessionContext(cwd);

  return await withLock(context.paths.lockDirectory, async () => {
    let state = readState(context.paths.statePath);

    state = await fitStateToReality(context, state, io);

    const { worktreePath } = context.git;
    const record = state.worktrees[worktreePath];

    if (!record) {
      io.log("이 worktree에는 실행 중인 개발 세션이 없습니다.");

      return { hadSession: false };
    }

    const platform = record.activePlatform;

    await stopOwnProcesses(worktreePath, state);
    await shutdownActiveDevice(context, state, platform);
    writeState(context.paths.statePath, state);

    io.log(
      platform
        ? `${platform} 개발 세션을 종료했습니다. slot ${record.slot}, 기기 배정과 앱 데이터는 그대로 둡니다.`
        : "실행 중인 프로세스가 없어 상태만 정리했습니다."
    );

    return { hadSession: Boolean(platform) };
  });
}

export interface RemoveResult {
  releasedDevices: string[];
}

/**
 * Gives this worktree's resources back to the repository. The Git worktree,
 * the pooled devices themselves and the shared builds all stay.
 */
export async function removeSession({
  cwd,
  io,
}: StopInput): Promise<RemoveResult> {
  const context = await createSessionContext(cwd);

  return await withLock(context.paths.lockDirectory, async () => {
    let state = readState(context.paths.statePath);

    state = await fitStateToReality(context, state, io);

    const { worktreePath } = context.git;
    const record = state.worktrees[worktreePath];

    if (!record) {
      io.log("이 worktree에는 정리할 개발 자원이 없습니다.");

      return { releasedDevices: [] };
    }

    await stopOwnProcesses(worktreePath, state);
    await shutdownActiveDevice(context, state, record.activePlatform);

    const released: string[] = [];

    for (const platform of PLATFORMS) {
      const deviceId = record.devices[platform];

      if (!deviceId) {
        continue;
      }

      // biome-ignore lint/performance/noAwaitInLoops: erasing devices in parallel makes the tools contend for the same daemons.
      await driverFor(context, platform).eraseToPool(deviceId);
      releaseDevice(state, platform, deviceId);
      released.push(`${platform} ${deviceId}`);
    }

    rmSync(worktreeLogDirectory(context.paths, worktreePath), {
      force: true,
      recursive: true,
    });
    delete state.worktrees[worktreePath];
    writeState(context.paths.statePath, state);

    io.log(
      `개발 자원을 정리하고 slot ${record.slot}을 반납했습니다. Git worktree, 풀의 기기와 저장소 공용 빌드는 그대로 둡니다.`
    );

    return { releasedDevices: released };
  });
}
