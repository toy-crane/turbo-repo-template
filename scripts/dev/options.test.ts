import { describe, expect, test } from "bun:test";

import { parseDevCommand, USAGE } from "./options";

const usageMessage = /bun run dev <ios\|android>/;

describe("parseDevCommand", () => {
  test("플랫폼 인수를 명령으로 바꾼다", () => {
    expect(parseDevCommand(["ios"])).toEqual({
      clear: false,
      kind: "start",
      platforms: ["ios"],
    });
    expect(parseDevCommand(["android"])).toEqual({
      clear: false,
      kind: "start",
      platforms: ["android"],
    });
  });

  test("플랫폼 여러 개를 적은 순서대로 담는다", () => {
    expect(parseDevCommand(["ios", "android"])).toEqual({
      clear: false,
      kind: "start",
      platforms: ["ios", "android"],
    });
    expect(parseDevCommand(["android", "ios"])).toEqual({
      clear: false,
      kind: "start",
      platforms: ["android", "ios"],
    });
  });

  test("같은 플랫폼을 두 번 적으면 하나로 합친다", () => {
    expect(parseDevCommand(["ios", "ios"])).toEqual({
      clear: false,
      kind: "start",
      platforms: ["ios"],
    });
  });

  test("bun run이 넣는 `--` 구분자는 무시한다", () => {
    expect(parseDevCommand(["--", "ios"])).toEqual({
      clear: false,
      kind: "start",
      platforms: ["ios"],
    });
  });

  test("--clear는 위치와 관계없이 Metro 초기화 요청으로 바꾼다", () => {
    expect(parseDevCommand(["ios", "--clear"])).toEqual({
      clear: true,
      kind: "start",
      platforms: ["ios"],
    });
    expect(parseDevCommand(["--clear", "ios", "android"])).toEqual({
      clear: true,
      kind: "start",
      platforms: ["ios", "android"],
    });
  });

  test("stop, remove, status는 플랫폼 없이 동작한다", () => {
    expect(parseDevCommand(["stop"])).toEqual({ kind: "stop" });
    expect(parseDevCommand(["remove"])).toEqual({ kind: "remove" });
    expect(parseDevCommand(["status"])).toEqual({ kind: "status" });
  });

  test("플랫폼을 생략하면 사용법과 함께 실패한다", () => {
    expect(() => parseDevCommand([])).toThrow(usageMessage);
    expect(() => parseDevCommand(["--clear"])).toThrow(usageMessage);
  });

  test("알 수 없는 인수는 사용법과 함께 실패한다", () => {
    expect(() => parseDevCommand(["web"])).toThrow(usageMessage);
    expect(() => parseDevCommand(["IOS"])).toThrow(usageMessage);
    expect(() => parseDevCommand(["stop", "ios"])).toThrow(usageMessage);
    expect(() => parseDevCommand(["stop", "--clear"])).toThrow(usageMessage);
  });

  test("사용법이 여러 플랫폼을 한 줄에 적는 형태를 안내한다", () => {
    expect(USAGE).toContain("bun run dev ios android");
    expect(USAGE).toContain("bun run dev:status");
  });
});
