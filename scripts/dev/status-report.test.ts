import { describe, expect, test } from "bun:test";
import { createEmptyState, type RepositoryState } from "./state";
import {
  buildStatusReport,
  renderStatusReport,
  type StatusFacts,
} from "./status-report";

const MAIN = "/repo";
const FEATURE = "/repo/.worktrees/feature";

function factsWith(overrides: Partial<StatusFacts> = {}): StatusFacts {
  return {
    androidSerials: new Map(),
    bootedIos: new Set(),
    existingDeviceIds: {},
    iosNames: new Map(),
    isProcessAlive: () => false,
    worktreeExists: () => true,
    ...overrides,
  };
}

function stateWithSession(): RepositoryState {
  const state = createEmptyState();

  state.worktrees[MAIN] = {
    activePlatforms: ["ios"],
    devices: { android: "repo_dev_1", ios: "UDID-1" },
    environmentFingerprint: "env",
    label: "main",
    processes: {
      api: { logPath: "/log/api.log", pid: 11, port: 3900 },
      metro: { logPath: "/log/metro.log", pid: 12, port: 8081 },
    },
    slot: 0,
  };
  state.devicePool.ios["UDID-1"] = {
    installedFingerprint: "f1",
    leasedTo: MAIN,
  };
  state.devicePool.android.repo_dev_1 = {
    installedFingerprint: null,
    leasedTo: MAIN,
  };

  return state;
}

describe("buildStatusReport", () => {
  test("빈 상태는 worktree와 대기 기기 없이 돌아온다", () => {
    const report = buildStatusReport(createEmptyState(), factsWith());

    expect(report.worktrees).toEqual([]);
    expect(report.idle).toEqual([]);
  });

  test("worktree의 slot, 포트, 프로세스 생존과 기기를 담는다", () => {
    const state = stateWithSession();
    const report = buildStatusReport(
      state,
      factsWith({
        androidSerials: new Map([["repo_dev_1", "emulator-5554"]]),
        bootedIos: new Set(["UDID-1"]),
        existingDeviceIds: {
          android: new Set(["repo_dev_1"]),
          ios: new Set(["UDID-1"]),
        },
        iosNames: new Map([["UDID-1", "repo-slot-0"]]),
        isProcessAlive: (_path, kind) => kind === "api",
      })
    );

    expect(report.worktrees).toHaveLength(1);

    const [worktree] = report.worktrees;

    expect(worktree?.slot).toBe(0);
    expect(worktree?.label).toBe("main");
    expect(worktree?.gone).toBe(false);
    expect(worktree?.activePlatforms).toEqual(["ios"]);
    expect(worktree?.api).toEqual({ alive: true, pid: 11, port: 3900 });
    expect(worktree?.metro).toEqual({ alive: false, pid: 12, port: 8081 });
    expect(worktree?.devices).toEqual([
      {
        booted: true,
        deviceId: "repo_dev_1",
        missing: false,
        name: undefined,
        platform: "android",
        serial: "emulator-5554",
      },
      {
        booted: true,
        deviceId: "UDID-1",
        missing: false,
        name: "repo-slot-0",
        platform: "ios",
        serial: undefined,
      },
    ]);
  });

  test("세션이 멈춘 worktree도 slot의 포트를 보여 준다", () => {
    const state = stateWithSession();

    state.worktrees[MAIN] = {
      ...(state.worktrees[MAIN] as (typeof state.worktrees)[string]),
      processes: {},
      slot: 2,
    };

    const [worktree] = buildStatusReport(state, factsWith()).worktrees;

    expect(worktree?.api).toEqual({ alive: false, pid: undefined, port: 3920 });
    expect(worktree?.metro).toEqual({
      alive: false,
      pid: undefined,
      port: 8101,
    });
  });

  test("Git 목록에서 사라진 worktree와 사라진 기기를 표시한다", () => {
    const state = stateWithSession();
    const report = buildStatusReport(
      state,
      factsWith({
        existingDeviceIds: { android: new Set(), ios: new Set() },
        worktreeExists: () => false,
      })
    );

    const [worktree] = report.worktrees;

    if (!worktree) {
      throw new Error("worktree 상태가 비어 있다");
    }

    expect(worktree.gone).toBe(true);
    expect(worktree.devices.every((entry) => entry.missing)).toBe(true);
  });

  test("도구가 없어 목록을 못 읽은 플랫폼은 사라진 기기로 표시하지 않는다", () => {
    const state = stateWithSession();
    const report = buildStatusReport(
      state,
      factsWith({ existingDeviceIds: {}, iosNames: undefined })
    );

    const [worktree] = report.worktrees;

    if (!worktree) {
      throw new Error("worktree 상태가 비어 있다");
    }

    expect(worktree.devices.every((entry) => !entry.missing)).toBe(true);
    expect(
      worktree.devices.find((entry) => entry.platform === "ios")?.name
    ).toBeUndefined();
  });

  test("배정되지 않은 풀 기기를 대기 목록에 담고 slot 순서로 정렬한다", () => {
    const state = stateWithSession();

    state.devicePool.ios["UDID-2"] = {
      installedFingerprint: null,
      leasedTo: null,
    };
    state.worktrees[FEATURE] = {
      activePlatforms: [],
      devices: {},
      environmentFingerprint: null,
      label: "feature",
      processes: {},
      slot: 2,
    };

    const report = buildStatusReport(
      state,
      factsWith({ iosNames: new Map([["UDID-2", "repo-dev-2"]]) })
    );

    expect(report.worktrees.map((entry) => entry.slot)).toEqual([0, 2]);
    expect(report.idle).toEqual([
      {
        booted: false,
        deviceId: "UDID-2",
        missing: false,
        name: "repo-dev-2",
        platform: "ios",
        serial: undefined,
      },
    ]);
  });
});

describe("renderStatusReport", () => {
  test("빈 보고는 세션이 없다고 말한다", () => {
    const lines = renderStatusReport(
      buildStatusReport(createEmptyState(), factsWith())
    );

    expect(lines.join("\n")).toContain("개발 세션 상태가 없습니다");
  });

  test("worktree 한 줄 요약과 기기 줄을 만든다", () => {
    const lines = renderStatusReport(
      buildStatusReport(
        stateWithSession(),
        factsWith({
          androidSerials: new Map([["repo_dev_1", "emulator-5554"]]),
          bootedIos: new Set(["UDID-1"]),
          iosNames: new Map([["UDID-1", "repo-slot-0"]]),
          isProcessAlive: () => true,
        })
      )
    );
    const text = lines.join("\n");

    expect(text).toContain("main");
    expect(text).toContain("slot 0");
    expect(text).toContain("3900");
    expect(text).toContain("8081");
    expect(text).toContain("repo-slot-0");
    expect(text).toContain("UDID-1");
    expect(text).toContain("emulator-5554");
  });
});
