import { describe, expect, test } from "@jest/globals";

import { getVerificationMessage } from "./get-verification-message";

describe("getVerificationMessage", () => {
  test("검증 전 상태를 안내한다", () => {
    expect(getVerificationMessage(false)).toBe("Development Build 검증 대기");
  });

  test("검증 완료 상태를 안내한다", () => {
    expect(getVerificationMessage(true)).toBe("Development Build 검증 완료");
  });
});
