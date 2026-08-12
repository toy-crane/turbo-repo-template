import { describe, expect, test } from "bun:test";

import { parseDevCommand } from "./options";

const usageMessage = /bun run dev <ios\|android>/;

describe("parseDevCommand", () => {
  test("플랫폼 인수를 명령으로 바꾼다", () => {
    expect(parseDevCommand(["ios"])).toEqual({
      kind: "start",
      platform: "ios",
    });
    expect(parseDevCommand(["android"])).toEqual({
      kind: "start",
      platform: "android",
    });
  });

  test("bun run이 넣는 `--` 구분자는 무시한다", () => {
    expect(parseDevCommand(["--", "ios"])).toEqual({
      kind: "start",
      platform: "ios",
    });
  });

  test("stop과 remove는 플랫폼 없이 동작한다", () => {
    expect(parseDevCommand(["stop"])).toEqual({ kind: "stop" });
    expect(parseDevCommand(["remove"])).toEqual({ kind: "remove" });
  });

  test("플랫폼을 생략하면 사용법과 함께 실패한다", () => {
    expect(() => parseDevCommand([])).toThrow(usageMessage);
  });

  test("알 수 없는 플랫폼은 사용법과 함께 실패한다", () => {
    expect(() => parseDevCommand(["web"])).toThrow(usageMessage);
    expect(() => parseDevCommand(["IOS"])).toThrow(usageMessage);
  });

  test("인수가 많으면 실패한다", () => {
    expect(() => parseDevCommand(["ios", "android"])).toThrow(usageMessage);
    expect(() => parseDevCommand(["stop", "ios"])).toThrow(usageMessage);
  });
});
