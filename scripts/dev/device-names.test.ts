import { describe, expect, test } from "bun:test";

import type { SimulatorDevice } from "./adapters/ios";
import {
  androidDisplayName,
  nextName,
  planPoolRename,
  planSimulatorRename,
  poolNamePrefix,
  simulatorSlotName,
} from "./device-names";

function device(udid: string, name: string): SimulatorDevice {
  return { booted: false, name, udid };
}

describe("이름 규칙", () => {
  test("배정 이름은 slug와 slot을 담는다", () => {
    expect(simulatorSlotName("example", 2)).toBe("example-slot-2");
    expect(androidDisplayName("example", 2)).toBe("example slot 2");
  });

  test("풀 이름은 빈 번호를 찾는다", () => {
    expect(nextName("example-dev-", new Set())).toBe("example-dev-1");
    expect(
      nextName("example-dev-", new Set(["example-dev-1", "example-dev-2"]))
    ).toBe("example-dev-3");
  });
});

describe("planSimulatorRename", () => {
  test("이미 원하는 이름이면 아무것도 하지 않는다", () => {
    expect(
      planSimulatorRename(
        [device("A", "example-slot-1")],
        "A",
        "example-slot-1",
        poolNamePrefix("example")
      )
    ).toEqual([]);
  });

  test("배정된 기기를 slot 이름으로 바꾼다", () => {
    expect(
      planSimulatorRename(
        [device("A", "example-dev-1")],
        "A",
        "example-slot-1",
        poolNamePrefix("example")
      )
    ).toEqual([{ name: "example-slot-1", udid: "A" }]);
  });

  test("같은 이름을 가진 다른 기기를 먼저 풀 이름으로 비운다", () => {
    expect(
      planSimulatorRename(
        [
          device("A", "example-dev-1"),
          device("B", "example-slot-1"),
          device("C", "example-dev-2"),
        ],
        "A",
        "example-slot-1",
        poolNamePrefix("example")
      )
    ).toEqual([
      { name: "example-dev-3", udid: "B" },
      { name: "example-slot-1", udid: "A" },
    ]);
  });

  test("목록에 없는 기기는 건드리지 않는다", () => {
    expect(
      planSimulatorRename(
        [device("B", "example-dev-1")],
        "A",
        "example-slot-1",
        poolNamePrefix("example")
      )
    ).toEqual([]);
  });

  test("다른 worktree가 빌린 기기가 그 이름을 쓰면 아무것도 바꾸지 않는다", () => {
    expect(
      planSimulatorRename(
        [device("A", "example-dev-1"), device("B", "example-slot-1")],
        "A",
        "example-slot-1",
        poolNamePrefix("example"),
        new Set(["B"])
      )
    ).toEqual([]);
  });
});

describe("planPoolRename", () => {
  test("slot 이름을 쓰던 기기를 빈 풀 이름으로 되돌린다", () => {
    expect(
      planPoolRename(
        [device("A", "example-slot-1"), device("B", "example-dev-1")],
        "A",
        poolNamePrefix("example")
      )
    ).toEqual({ name: "example-dev-2", udid: "A" });
  });

  test("이미 풀 이름이면 아무것도 하지 않는다", () => {
    expect(
      planPoolRename(
        [device("A", "example-dev-1")],
        "A",
        poolNamePrefix("example")
      )
    ).toBeUndefined();
  });

  test("목록에 없는 기기는 건드리지 않는다", () => {
    expect(planPoolRename([], "A", poolNamePrefix("example"))).toBeUndefined();
  });
});
