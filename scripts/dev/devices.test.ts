import { describe, expect, test } from "bun:test";

import {
  leaseDevice,
  recordInstalledFingerprint,
  releaseDevice,
  selectDevice,
} from "./devices";
import { createEmptyState, type RepositoryState } from "./state";

const MAIN = "/repo";
const FEATURE = "/repo/.worktrees/feature";

function stateWithWorktrees(paths: string[]): RepositoryState {
  const state = createEmptyState();

  for (const [index, path] of paths.entries()) {
    state.worktrees[path] = {
      activePlatforms: [],
      devices: {},
      environmentFingerprint: null,
      label: `w${index}`,
      processes: {},
      slot: index,
    };
  }

  return state;
}

describe("selectDevice", () => {
  test("배정된 기기가 있으면 그대로 쓴다", () => {
    const state = stateWithWorktrees([MAIN]);

    leaseDevice(state, "ios", "UDID-1", MAIN);

    expect(
      selectDevice({ platform: "ios", state, worktreePath: MAIN })
    ).toEqual({ deviceId: "UDID-1", reason: "leased" });
  });

  test("배정된 기기가 없으면 풀의 빈 기기를 먼저 쓴다", () => {
    const state = stateWithWorktrees([MAIN, FEATURE]);

    state.devicePool.ios["UDID-FREE"] = {
      installedFingerprint: null,
      leasedTo: null,
    };

    expect(
      selectDevice({ platform: "ios", state, worktreePath: FEATURE })
    ).toEqual({ deviceId: "UDID-FREE", reason: "pooled" });
  });

  test("풀이 비어 있을 때만 새 기기를 만든다", () => {
    const state = stateWithWorktrees([MAIN, FEATURE]);

    leaseDevice(state, "ios", "UDID-1", MAIN);

    expect(
      selectDevice({ platform: "ios", state, worktreePath: FEATURE })
    ).toEqual({ reason: "create" });
  });

  test("같은 기기를 두 worktree에 동시에 주지 않는다", () => {
    const state = stateWithWorktrees([MAIN, FEATURE]);

    leaseDevice(state, "ios", "UDID-1", MAIN);
    leaseDevice(state, "ios", "UDID-2", FEATURE);

    const first = selectDevice({ platform: "ios", state, worktreePath: MAIN });
    const second = selectDevice({
      platform: "ios",
      state,
      worktreePath: FEATURE,
    });

    expect(first).toEqual({ deviceId: "UDID-1", reason: "leased" });
    expect(second).toEqual({ deviceId: "UDID-2", reason: "leased" });
  });

  test("플랫폼별로 따로 배정한다", () => {
    const state = stateWithWorktrees([MAIN]);

    leaseDevice(state, "ios", "UDID-1", MAIN);

    expect(
      selectDevice({ platform: "android", state, worktreePath: MAIN })
    ).toEqual({ reason: "create" });
  });
});

describe("기기 수명", () => {
  test("만들고 지운 worktree가 반복돼도 기기가 늘어나지 않는다", () => {
    const state = stateWithWorktrees([MAIN]);

    leaseDevice(state, "ios", "UDID-1", MAIN);
    recordInstalledFingerprint(state, "ios", "UDID-1", "fp");
    releaseDevice(state, "ios", "UDID-1");

    // 다음 worktree가 같은 플랫폼을 요청한다.
    state.worktrees[FEATURE] = {
      activePlatforms: [],
      devices: {},
      environmentFingerprint: null,
      label: "feature",
      processes: {},
      slot: 1,
    };

    const choice = selectDevice({
      platform: "ios",
      state,
      worktreePath: FEATURE,
    });

    expect(choice).toEqual({ deviceId: "UDID-1", reason: "pooled" });
    expect(Object.keys(state.devicePool.ios)).toEqual(["UDID-1"]);
  });

  test("풀에서 받은 기기는 설치 fingerprint 없이 시작한다", () => {
    const state = stateWithWorktrees([MAIN, FEATURE]);

    leaseDevice(state, "ios", "UDID-1", MAIN);
    recordInstalledFingerprint(state, "ios", "UDID-1", "fp");
    releaseDevice(state, "ios", "UDID-1");
    leaseDevice(state, "ios", "UDID-1", FEATURE);

    expect(state.devicePool.ios["UDID-1"]).toEqual({
      installedFingerprint: null,
      leasedTo: FEATURE,
    });
  });

  test("같은 worktree가 다시 배정받으면 설치 상태를 유지한다", () => {
    const state = stateWithWorktrees([MAIN]);

    leaseDevice(state, "ios", "UDID-1", MAIN);
    recordInstalledFingerprint(state, "ios", "UDID-1", "fp");
    leaseDevice(state, "ios", "UDID-1", MAIN);

    expect(state.devicePool.ios["UDID-1"]?.installedFingerprint).toBe("fp");
  });

  test("반납한 기기는 풀에 남는다", () => {
    const state = stateWithWorktrees([MAIN]);

    leaseDevice(state, "ios", "UDID-1", MAIN);
    releaseDevice(state, "ios", "UDID-1");

    expect(state.devicePool.ios["UDID-1"]).toEqual({
      installedFingerprint: null,
      leasedTo: null,
    });
  });
});
