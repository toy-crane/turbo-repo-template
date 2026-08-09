import { describe, expect, test } from "bun:test";

import {
  assertLocalSupabaseUrl,
  extractOtpCode,
  type MailpitSummary,
  parseOtpArgs,
  readEnvValue,
  selectFreshMessage,
} from "./read-local-email-otp";

const unknownOptionMessage = /알 수 없는 옵션/;
const missingValueMessage = /값이 필요합니다/;
const missingEmailMessage = /--email 옵션이 필요합니다/;
const localOnlyMessage = /로컬 Supabase에서만 동작/;
const noCodeMessage = /6자리 코드를 찾지 못했습니다/;
const ambiguousCodeMessage = /여러 개 찾았습니다/;
const emailFormatMessage = /이메일 주소 형식/;
const positiveSecondsMessage = /양수 초/;
const mobileEnvFileMessage = /apps\/mobile\/\.env\.local/;
const notAUrlMessage = /URL이 아닙니다/;

function summary(id: string, address: string, arrivedAt: string) {
  return {
    arrivedAt: new Date(arrivedAt),
    id,
    recipients: [address],
  } satisfies MailpitSummary;
}

describe("parseOtpArgs", () => {
  test("이메일과 제한 시간을 읽는다", () => {
    expect(
      parseOtpArgs(["--email", "a@example.test", "--timeout", "5"])
    ).toEqual({ email: "a@example.test", timeoutMs: 5000 });
  });

  test("등호로 붙여 쓴 값도 읽는다", () => {
    expect(parseOtpArgs(["--email=a@example.test"]).email).toBe(
      "a@example.test"
    );
  });

  test("이메일이 없으면 실행하지 않는다", () => {
    expect(() => parseOtpArgs([])).toThrow(missingEmailMessage);
  });

  test("이메일 형식이 아니면 거절한다", () => {
    expect(() => parseOtpArgs(["--email", "not-an-address"])).toThrow(
      emailFormatMessage
    );
  });

  test("알 수 없는 옵션을 거절한다", () => {
    expect(() => parseOtpArgs(["--inbox", "x"])).toThrow(unknownOptionMessage);
  });

  test("값이 빠진 옵션을 거절한다", () => {
    expect(() => parseOtpArgs(["--email"])).toThrow(missingValueMessage);
  });

  test("뒤따르는 다른 옵션을 값으로 삼지 않는다", () => {
    expect(() => parseOtpArgs(["--email", "--timeout", "5"])).toThrow(
      missingValueMessage
    );
  });

  test("제한 시간이 양수가 아니면 거절한다", () => {
    expect(() =>
      parseOtpArgs(["--email", "a@example.test", "--timeout", "0"])
    ).toThrow(positiveSecondsMessage);
  });
});

describe("assertLocalSupabaseUrl", () => {
  test.each([
    "http://127.0.0.1:54321",
    "http://localhost:54321",
    // The Android emulator reaches the host loopback through this alias.
    "http://10.0.2.2:54321",
  ])("로컬 주소 %s를 허용한다", (url) => {
    expect(assertLocalSupabaseUrl(url).origin).toBe(new URL(url).origin);
  });

  test("원격 Supabase를 가리키면 코드를 읽지 않는다", () => {
    expect(() =>
      assertLocalSupabaseUrl("https://abcdefgh.supabase.co")
    ).toThrow(localOnlyMessage);
  });

  test("알 수 없는 호스트를 거절한다", () => {
    expect(() => assertLocalSupabaseUrl("http://192.168.0.42:54321")).toThrow(
      localOnlyMessage
    );
  });

  test("값이 없으면 어디를 고쳐야 하는지 알려준다", () => {
    expect(() => assertLocalSupabaseUrl(undefined)).toThrow(
      mobileEnvFileMessage
    );
  });

  test("URL이 아니면 거절한다", () => {
    expect(() => assertLocalSupabaseUrl("54321")).toThrow(notAUrlMessage);
  });
});

describe("readEnvValue", () => {
  test("주석과 다른 변수를 건너뛰고 값을 읽는다", () => {
    const contents = [
      "# 주석",
      "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_x",
      'EXPO_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"',
    ].join("\n");

    expect(readEnvValue(contents, "EXPO_PUBLIC_SUPABASE_URL")).toBe(
      "http://127.0.0.1:54321"
    );
  });

  test("없는 변수는 undefined를 준다", () => {
    expect(readEnvValue("A=1", "B")).toBeUndefined();
  });
});

describe("selectFreshMessage", () => {
  const notBefore = new Date("2026-08-09T06:00:00Z");

  test("같은 수신자의 가장 최근 메일을 고른다", () => {
    const chosen = selectFreshMessage(
      [
        summary("old", "a@example.test", "2026-08-09T06:01:00Z"),
        summary("new", "a@example.test", "2026-08-09T06:03:00Z"),
      ],
      "a@example.test",
      notBefore
    );

    expect(chosen?.id).toBe("new");
  });

  test("대소문자가 달라도 같은 수신자로 본다", () => {
    const chosen = selectFreshMessage(
      [summary("only", "A@Example.Test", "2026-08-09T06:01:00Z")],
      "a@example.test",
      notBefore
    );

    expect(chosen?.id).toBe("only");
  });

  test("다른 수신자의 메일은 고르지 않는다", () => {
    const chosen = selectFreshMessage(
      [summary("other", "b@example.test", "2026-08-09T06:01:00Z")],
      "a@example.test",
      notBefore
    );

    expect(chosen).toBeUndefined();
  });

  test("기준 시각보다 오래된 코드는 고르지 않는다", () => {
    const chosen = selectFreshMessage(
      [summary("stale", "a@example.test", "2026-08-09T05:30:00Z")],
      "a@example.test",
      notBefore
    );

    expect(chosen).toBeUndefined();
  });
});

describe("extractOtpCode", () => {
  test("본문 텍스트에서 6자리 코드를 읽는다", () => {
    expect(
      extractOtpCode({
        text: "앱 로그인 화면에 아래 6자리 코드를 입력하세요.\n\n048860\n",
      })
    ).toBe("048860");
  });

  test("텍스트가 없으면 HTML에서 읽는다", () => {
    expect(
      extractOtpCode({ html: "<p>코드</p><p>123456</p>", text: "  " })
    ).toBe("123456");
  });

  test("코드가 없으면 템플릿을 확인하라고 알린다", () => {
    expect(() => extractOtpCode({ text: "여기 링크를 누르세요" })).toThrow(
      noCodeMessage
    );
  });

  test("6자리 숫자가 여러 개면 추측하지 않는다", () => {
    expect(() => extractOtpCode({ text: "048860 그리고 123456" })).toThrow(
      ambiguousCodeMessage
    );
  });

  test("7자리 이상 숫자는 코드로 보지 않는다", () => {
    expect(() => extractOtpCode({ text: "주문번호 12345678" })).toThrow(
      noCodeMessage
    );
  });
});
