import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createEmptyState,
  parseState,
  type RepositoryState,
  readState,
  writeState,
} from "./state";

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "dev-state-"));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

function fullState(): RepositoryState {
  return {
    devicePool: {
      android: { "avd-1": { installedFingerprint: "afp", leasedTo: "/repo" } },
      ios: { "UDID-1": { installedFingerprint: null, leasedTo: null } },
    },
    version: 1,
    worktrees: {
      "/repo": {
        activePlatforms: ["ios"],
        devices: { android: "avd-1" },
        environmentFingerprint: "env-fp",
        label: "main",
        processes: {
          api: { logPath: "/cache/api.log", pid: 11, port: 3900 },
          metro: { logPath: "/cache/metro.log", pid: 12, port: 8081 },
        },
        slot: 0,
      },
    },
  };
}

describe("상태 저장", () => {
  test("쓰고 읽으면 같은 상태가 나온다", () => {
    const statePath = join(root, "nested", "state.json");

    writeState(statePath, fullState());

    expect(readState(statePath)).toEqual(fullState());
  });

  test("임시 파일을 남기지 않는다", () => {
    const statePath = join(root, "state.json");

    writeState(statePath, fullState());
    writeState(statePath, createEmptyState());

    expect(readdirSync(root)).toEqual(["state.json"]);
  });

  test("파일이 없으면 빈 상태로 시작한다", () => {
    expect(readState(join(root, "missing.json"))).toEqual(createEmptyState());
  });

  test("망가진 파일도 세션을 막지 않는다", () => {
    const statePath = join(root, "state.json");

    writeFileSync(statePath, "{ 반쯤 쓰다 만");

    expect(readState(statePath)).toEqual(createEmptyState());
  });
});

describe("parseState", () => {
  test("모르는 버전은 빈 상태로 본다", () => {
    expect(parseState({ ...fullState(), version: 99 })).toEqual(
      createEmptyState()
    );
  });

  test("형식이 어긋난 항목만 버리고 나머지는 지킨다", () => {
    const parsed = parseState({
      devicePool: { android: {}, ios: { "UDID-1": { leasedTo: "/repo" } } },
      version: 1,
      worktrees: {
        "/broken": { slot: "일" },
        "/repo": {
          activePlatforms: ["web", "ios"],
          devices: { ios: 7 },
          processes: { api: { logPath: "/a.log", pid: 11 } },
          slot: 2,
        },
      },
    });

    expect(parsed.worktrees["/broken"]).toBeUndefined();
    expect(parsed.worktrees["/repo"]).toEqual({
      activePlatforms: ["ios"],
      devices: {},
      environmentFingerprint: null,
      label: "",
      processes: {},
      slot: 2,
    });
    expect(parsed.devicePool.ios["UDID-1"]).toEqual({
      installedFingerprint: null,
      leasedTo: "/repo",
    });
  });
});
