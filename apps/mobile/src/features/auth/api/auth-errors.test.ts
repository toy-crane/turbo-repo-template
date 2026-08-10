import { describe, expect, test } from "@jest/globals";

import {
  classifyAuthError,
  MissingProviderTokenError,
  NoProviderCredentialError,
} from "./auth-errors";

function supabaseError(fields: { code?: string; status?: number }) {
  return Object.assign(new Error("Supabase rejected the request"), fields);
}

describe("classifyAuthError", () => {
  test("Apple 취소는 실패로 보지 않는다", () => {
    expect(
      classifyAuthError(
        Object.assign(new Error("The user canceled"), {
          code: "ERR_REQUEST_CANCELED",
        })
      )
    ).toEqual({ kind: "cancelled", message: "" });
  });

  test("Google 취소는 실패로 보지 않는다", () => {
    expect(
      classifyAuthError(
        Object.assign(new Error("cancelled"), { code: "SIGN_IN_CANCELLED" })
      )
    ).toEqual({ kind: "cancelled", message: "" });
  });

  test("토큰이 빠진 응답은 따로 구분한다", () => {
    expect(classifyAuthError(new MissingProviderTokenError()).kind).toBe(
      "missingToken"
    );
  });

  test("자격 정보를 찾지 못한 경우는 취소와 다르게 안내한다", () => {
    const failure = classifyAuthError(new NoProviderCredentialError());

    expect(failure.kind).toBe("noProviderCredential");
    expect(failure.message).not.toBe("");
  });

  test("Supabase의 재시도 가능한 통신 오류는 네트워크로 본다", () => {
    expect(
      classifyAuthError(
        Object.assign(new Error("Failed to fetch"), {
          name: "AuthRetryableFetchError",
        })
      ).kind
    ).toBe("network");
  });

  test("React Native fetch 실패도 네트워크로 본다", () => {
    expect(
      classifyAuthError(new TypeError("Network request failed")).kind
    ).toBe("network");
  });

  test("전송 한도는 잠시 뒤 다시 시도하라고 알린다", () => {
    expect(
      classifyAuthError(supabaseError({ code: "over_email_send_rate_limit" }))
        .kind
    ).toBe("rateLimited");
  });

  test("상태 코드 429도 전송 한도로 본다", () => {
    expect(classifyAuthError(supabaseError({ status: 429 })).kind).toBe(
      "rateLimited"
    );
  });

  test("잘못되거나 만료된 코드는 하나의 안내로 묶는다", () => {
    const failure = classifyAuthError(supabaseError({ code: "otp_expired" }));

    expect(failure.kind).toBe("invalidCode");
    // Supabase answers a wrong code and an expired one alike, so the message
    // names the step that works either way rather than guessing which happened.
    expect(failure.message).toBe("코드를 다시 입력해 주세요.");
  });

  test("서버가 거절한 이메일은 입력을 다시 보게 한다", () => {
    expect(
      classifyAuthError(supabaseError({ code: "email_address_invalid" })).kind
    ).toBe("invalidEmail");
  });

  test("알 수 없는 오류는 원인을 함께 보여준다", () => {
    const failure = classifyAuthError(new Error("Unexpected failure"));

    expect(failure.kind).toBe("unknown");
    expect(failure.message).toContain("Unexpected failure");
  });

  test("Error가 아닌 값도 안내 문구를 만든다", () => {
    expect(classifyAuthError("boom")).toEqual({
      kind: "unknown",
      message: "다시 시도해 주세요.",
    });
  });
});
