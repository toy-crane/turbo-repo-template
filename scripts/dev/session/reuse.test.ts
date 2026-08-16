import { describe, expect, test } from "bun:test";

import type { WorktreeRecord } from "../state";
import { platformsAfterStart, sessionReuseReason, startPlan } from "./reuse";

function runningRecord(
  overrides: Partial<WorktreeRecord> = {}
): WorktreeRecord {
  return {
    activePlatforms: ["android"],
    devices: { android: "avd-1" },
    environmentFingerprint: "current-env",
    label: "main",
    processes: {
      api: { logPath: "/api.log", pid: 11, port: 3900 },
      metro: { logPath: "/metro.log", pid: 12, port: 8081 },
    },
    slot: 0,
    ...overrides,
  };
}

describe("sessionReuseReason", () => {
  test("환경과 Metro 입력이 그대로면 재사용한다", () => {
    expect(sessionReuseReason(runningRecord(), "current-env", true)).toBe(
      "reuse"
    );
  });

  test("아직 붙지 않은 플랫폼도 실행 중인 API와 Metro를 그대로 쓴다", () => {
    expect(
      sessionReuseReason(
        runningRecord({ activePlatforms: ["ios"] }),
        "current-env",
        true
      )
    ).toBe("reuse");
  });

  test("붙어 있는 플랫폼이 없어도 프로세스가 살아 있으면 재사용한다", () => {
    expect(
      sessionReuseReason(
        runningRecord({ activePlatforms: [] }),
        "current-env",
        true
      )
    ).toBe("reuse");
  });

  test("실행 중인 세션의 환경이 달라졌으면 다시 시작한다", () => {
    expect(sessionReuseReason(runningRecord(), "changed-env", true)).toBe(
      "environment-changed"
    );
  });

  test("실행 중인 세션의 Metro 입력이 달라졌으면 다시 시작한다", () => {
    expect(sessionReuseReason(runningRecord(), "current-env", false)).toBe(
      "metro-inputs-changed"
    );
  });

  test("이전 상태처럼 환경 fingerprint가 없으면 다시 시작한다", () => {
    expect(
      sessionReuseReason(
        runningRecord({ environmentFingerprint: null }),
        "current-env",
        true
      )
    ).toBe("environment-changed");
  });

  test("프로세스가 모두 실행 중이지 않으면 재사용하지 않는다", () => {
    expect(
      sessionReuseReason(runningRecord({ processes: {} }), "current-env", false)
    ).toBe("not-running");
  });

  test("API나 Metro 한쪽만 남아 있으면 재사용하지 않는다", () => {
    expect(
      sessionReuseReason(
        runningRecord({
          processes: { api: { logPath: "/api.log", pid: 11, port: 3900 } },
        }),
        "current-env",
        true
      )
    ).toBe("not-running");
  });
});

describe("startPlan", () => {
  test("붙어 있는 플랫폼을 다시 실행하면 앱만 다시 연다", () => {
    expect(
      startPlan({ attached: ["ios"], platform: "ios", running: true })
    ).toBe("relaunch");
  });

  test("새 플랫폼은 실행 중인 세션에 더해진다", () => {
    expect(
      startPlan({ attached: ["ios"], platform: "android", running: true })
    ).toBe("join");
  });

  test("프로세스를 다시 시작해야 하면 restart다", () => {
    expect(
      startPlan({ attached: ["ios"], platform: "android", running: false })
    ).toBe("restart");
  });
});

describe("platformsAfterStart", () => {
  test("다시 열기만 하면 붙어 있는 목록이 그대로다", () => {
    expect(platformsAfterStart("relaunch", ["ios"], "ios")).toEqual(["ios"]);
  });

  test("더해진 플랫폼은 기존 목록 뒤에 붙는다", () => {
    expect(platformsAfterStart("join", ["ios"], "android")).toEqual([
      "ios",
      "android",
    ]);
  });

  test("다시 시작하면 요청한 플랫폼과 다시 연결한 플랫폼만 남는다", () => {
    expect(platformsAfterStart("restart", ["ios"], "android", ["ios"])).toEqual(
      ["android", "ios"]
    );
  });

  test("다시 연결하지 못한 플랫폼은 목록에서 빠진다", () => {
    expect(platformsAfterStart("restart", ["ios"], "android")).toEqual([
      "android",
    ]);
  });
});
