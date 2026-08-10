import { describe, expect, test } from "@jest/globals";

import {
  OTP_LENGTH,
  RESEND_COOLDOWN_SECONDS,
} from "@/features/auth/config/email-otp";
import {
  formatResendLabel,
  isCompleteCode,
  isValidEmail,
  normalizeEmail,
  toCodeDigits,
} from "./email-code";

describe("normalizeEmail", () => {
  test("공백과 대문자를 정리한다", () => {
    expect(normalizeEmail("  Reader@Example.Test ")).toBe(
      "reader@example.test"
    );
  });
});

describe("isValidEmail", () => {
  test.each(["reader@example.test", " Reader@Example.Test "])(
    "%s를 받아들인다",
    (value) => {
      expect(isValidEmail(value)).toBe(true);
    }
  );

  test.each(["", "reader", "reader@example", "reader example.test", "a@b@c.d"])(
    "%s를 거절한다",
    (value) => {
      expect(isValidEmail(value)).toBe(false);
    }
  );
});

describe("toCodeDigits", () => {
  test("숫자만 남긴다", () => {
    expect(toCodeDigits(" 04-88 60 ")).toBe("048860");
  });

  test("코드 길이를 넘는 입력은 잘라낸다", () => {
    expect(toCodeDigits("0488601234")).toHaveLength(OTP_LENGTH);
  });
});

describe("isCompleteCode", () => {
  test("여섯 자리를 다 채워야 확인할 수 있다", () => {
    expect(isCompleteCode("04886")).toBe(false);
    expect(isCompleteCode("048860")).toBe(true);
  });
});

describe("formatResendLabel", () => {
  test("남은 시간이 있으면 초를 보여준다", () => {
    expect(formatResendLabel(RESEND_COOLDOWN_SECONDS)).toBe(
      "60초 후 다시 받기"
    );
  });

  test("대기가 끝나면 바로 다시 받을 수 있다고 알린다", () => {
    expect(formatResendLabel(0)).toBe("코드 다시 받기");
  });
});
