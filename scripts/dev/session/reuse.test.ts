import { describe, expect, test } from "bun:test";

import type { WorktreeRecord } from "../state";
import { sessionReuseReason } from "./reuse";

function runningRecord(
  overrides: Partial<WorktreeRecord> = {}
): WorktreeRecord {
  return {
    activePlatform: "android",
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
  test("같은 플랫폼과 환경으로 실행 중이면 재사용한다", () => {
    expect(sessionReuseReason(runningRecord(), "android", "current-env")).toBe(
      "reuse"
    );
  });

  test("실행 중인 세션의 환경이 달라졌으면 다시 시작한다", () => {
    expect(sessionReuseReason(runningRecord(), "android", "changed-env")).toBe(
      "environment-changed"
    );
  });

  test("이전 상태처럼 환경 fingerprint가 없으면 다시 시작한다", () => {
    expect(
      sessionReuseReason(
        runningRecord({ environmentFingerprint: null }),
        "android",
        "current-env"
      )
    ).toBe("environment-changed");
  });

  test("프로세스가 모두 실행 중이지 않으면 재사용하지 않는다", () => {
    expect(
      sessionReuseReason(
        runningRecord({ processes: {} }),
        "android",
        "current-env"
      )
    ).toBe("not-running");
  });
});
