import { describe, expect, test } from "bun:test";

import { type ReconcileFacts, reconcile } from "./reconcile";
import {
  createEmptyState,
  type ProcessRecord,
  type RepositoryState,
  type WorktreeRecord,
} from "./state";

const MAIN = "/repo";
const FEATURE = "/repo/.worktrees/feature";

function processRecord(pid: number, port: number): ProcessRecord {
  return { logPath: `/cache/${pid}.log`, pid, port };
}

function worktree(overrides: Partial<WorktreeRecord> = {}): WorktreeRecord {
  return {
    activePlatforms: [],
    devices: {},
    environmentFingerprint: null,
    label: "main",
    processes: {},
    slot: 0,
    ...overrides,
  };
}

function facts(overrides: Partial<ReconcileFacts> = {}): ReconcileFacts {
  return {
    existingDeviceIds: {},
    isSessionProcessLive: () => true,
    liveWorktrees: new Set([MAIN, FEATURE]),
    ...overrides,
  };
}

function stateWith(worktrees: Record<string, WorktreeRecord>): RepositoryState {
  return { ...createEmptyState(), worktrees };
}

describe("reconcile", () => {
  test("살아 있는 worktree의 정상 세션은 그대로 둔다", () => {
    const state = stateWith({
      [MAIN]: worktree({
        activePlatforms: ["ios"],
        processes: {
          api: processRecord(11, 3900),
          metro: processRecord(12, 8081),
        },
      }),
    });

    const result = reconcile(state, facts());

    expect(result.reclaimed).toEqual([]);
    expect(result.stranded).toEqual([]);
    expect(result.next.worktrees[MAIN]?.activePlatforms).toEqual(["ios"]);
    expect(result.next.worktrees[MAIN]?.processes.api?.pid).toBe(11);
  });

  test("API나 Metro만 죽으면 기기 배정과 slot을 유지한 채 프로세스 기록만 비운다", () => {
    const state: RepositoryState = {
      devicePool: {
        android: {},
        ios: { "UDID-1": { installedFingerprint: "fp", leasedTo: MAIN } },
      },
      version: 1,
      worktrees: {
        [MAIN]: worktree({
          activePlatforms: ["ios"],
          devices: { ios: "UDID-1" },
          environmentFingerprint: "env-fp",
          processes: {
            api: processRecord(11, 3900),
            metro: processRecord(12, 8081),
          },
          slot: 4,
        }),
      },
    };

    const result = reconcile(
      state,
      facts({ isSessionProcessLive: (_path, kind) => kind === "api" })
    );

    expect(result.stranded).toEqual([
      { processes: [processRecord(11, 3900)], worktreePath: MAIN },
    ]);

    const record = result.next.worktrees[MAIN];

    expect(record?.processes).toEqual({});
    expect(record?.activePlatforms).toEqual([]);
    expect(record?.environmentFingerprint).toBeNull();
    expect(record?.slot).toBe(4);
    expect(record?.devices.ios).toBe("UDID-1");
    expect(result.next.devicePool.ios["UDID-1"]).toEqual({
      installedFingerprint: "fp",
      leasedTo: MAIN,
    });
    expect(result.releasedDevices).toEqual([]);
  });

  test("사라진 worktree의 프로세스, slot과 기기를 회수한다", () => {
    const state: RepositoryState = {
      devicePool: {
        android: {
          "avd-1": { installedFingerprint: "afp", leasedTo: FEATURE },
        },
        ios: {
          "UDID-1": { installedFingerprint: "fp", leasedTo: MAIN },
          "UDID-2": { installedFingerprint: "fp", leasedTo: FEATURE },
        },
      },
      version: 1,
      worktrees: {
        [MAIN]: worktree({ devices: { ios: "UDID-1" } }),
        [FEATURE]: worktree({
          activePlatforms: ["ios"],
          devices: { android: "avd-1", ios: "UDID-2" },
          label: "feature",
          processes: {
            api: processRecord(21, 3910),
            metro: processRecord(22, 8091),
          },
          slot: 1,
        }),
      },
    };

    const result = reconcile(state, facts({ liveWorktrees: new Set([MAIN]) }));

    expect(result.next.worktrees[FEATURE]).toBeUndefined();
    expect(result.reclaimed).toEqual([
      {
        processes: [processRecord(21, 3910), processRecord(22, 8091)],
        worktreePath: FEATURE,
      },
    ]);
    expect(result.releasedDevices).toEqual([
      { deviceId: "avd-1", platform: "android" },
      { deviceId: "UDID-2", platform: "ios" },
    ]);
    // 풀에는 남기고 배정만 푼다. 다음 worktree가 새 기기를 만들지 않는다.
    expect(result.next.devicePool.ios["UDID-2"]).toEqual({
      installedFingerprint: null,
      leasedTo: null,
    });
    // 남아 있는 worktree는 그대로다.
    expect(result.next.devicePool.ios["UDID-1"]?.leasedTo).toBe(MAIN);
    expect(result.next.worktrees[MAIN]).toBeDefined();
  });

  test("사라진 worktree의 죽은 프로세스는 종료 목록에 넣지 않는다", () => {
    const state = stateWith({
      [FEATURE]: worktree({
        processes: { metro: processRecord(22, 8091) },
        slot: 1,
      }),
    });

    const result = reconcile(
      state,
      facts({
        isSessionProcessLive: () => false,
        liveWorktrees: new Set([MAIN]),
      })
    );

    expect(result.reclaimed).toEqual([
      { processes: [], worktreePath: FEATURE },
    ]);
  });

  test("기계에서 사라진 기기는 풀과 worktree 기록에서 지운다", () => {
    const state: RepositoryState = {
      devicePool: {
        android: {},
        ios: {
          "UDID-1": { installedFingerprint: "fp", leasedTo: MAIN },
          "UDID-GONE": { installedFingerprint: "fp", leasedTo: FEATURE },
        },
      },
      version: 1,
      worktrees: {
        [MAIN]: worktree({
          activePlatforms: ["ios"],
          devices: { ios: "UDID-1" },
        }),
        [FEATURE]: worktree({
          activePlatforms: ["android", "ios"],
          devices: { android: "avd-1", ios: "UDID-GONE" },
          slot: 1,
        }),
      },
    };

    const result = reconcile(
      state,
      facts({ existingDeviceIds: { ios: new Set(["UDID-1"]) } })
    );

    expect(result.next.devicePool.ios["UDID-GONE"]).toBeUndefined();
    expect(result.next.worktrees[FEATURE]?.devices.ios).toBeUndefined();
    // 앱은 기기와 함께 사라졌으므로 붙어 있는 플랫폼에서도 빠진다.
    expect(result.next.worktrees[FEATURE]?.activePlatforms).toEqual([
      "android",
    ]);
    expect(result.next.worktrees[MAIN]?.activePlatforms).toEqual(["ios"]);
    // 살아 있는 배정은 그대로 두고, 없어진 기기를 종료·초기화하러 가지 않는다.
    expect(result.next.devicePool.ios["UDID-1"]?.leasedTo).toBe(MAIN);
    expect(result.releasedDevices).toEqual([]);
  });

  test("읽지 못한 플랫폼의 기기 배정은 손대지 않는다", () => {
    const state: RepositoryState = {
      devicePool: {
        android: { "avd-1": { installedFingerprint: "afp", leasedTo: MAIN } },
        ios: {},
      },
      version: 1,
      worktrees: { [MAIN]: worktree({ devices: { android: "avd-1" } }) },
    };

    const result = reconcile(
      state,
      facts({ existingDeviceIds: { ios: new Set() } })
    );

    expect(result.next.devicePool.android["avd-1"]?.leasedTo).toBe(MAIN);
    expect(result.next.worktrees[MAIN]?.devices.android).toBe("avd-1");
  });

  test("가리키는 worktree가 없는 배정은 풀어 준다", () => {
    const state: RepositoryState = {
      devicePool: {
        android: {},
        ios: { "UDID-1": { installedFingerprint: "fp", leasedTo: "/gone" } },
      },
      version: 1,
      worktrees: { [MAIN]: worktree() },
    };

    const result = reconcile(state, facts());

    expect(result.next.devicePool.ios["UDID-1"]).toEqual({
      installedFingerprint: null,
      leasedTo: null,
    });
    expect(result.releasedDevices).toEqual([
      { deviceId: "UDID-1", platform: "ios" },
    ]);
  });

  test("입력 상태를 바꾸지 않는다", () => {
    const state = stateWith({
      [FEATURE]: worktree({ processes: { api: processRecord(21, 3910) } }),
    });
    const before = structuredClone(state);

    reconcile(state, facts({ liveWorktrees: new Set([MAIN]) }));

    expect(state).toEqual(before);
  });
});
