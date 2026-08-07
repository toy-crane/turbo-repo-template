import { describe, expect, test } from "@jest/globals";

import { getVerificationMessage } from "./get-verification-message";

describe("getVerificationMessage", () => {
  test("검증 전 상태를 안내한다", () => {
    expect(getVerificationMessage("pending")).toBe(
      "Development Build 검증 대기"
    );
  });

  test("검증 완료 상태를 안내한다", () => {
    expect(getVerificationMessage("verified")).toBe(
      "Development Build 검증 완료"
    );
  });

  test("Development Build가 아닐 때 안내한다", () => {
    expect(getVerificationMessage("unavailable")).toBe(
      "Development Build 런타임을 확인할 수 없음"
    );
  });
});
