import { describe, expect, test } from "@jest/globals";

import { developmentSessionHost, getMobileEnv, parseMobileEnv } from "./env";

const envError = /^Invalid mobile environment variables:/;
const apiUrlVariable = /EXPO_PUBLIC_API_URL/;
const googleIosClientIdVariable = /EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID/;
const googleWebClientIdVariable = /EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/;
const invalidFormattedVariables =
  /EXPO_PUBLIC_API_URL[\s\S]*EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID[\s\S]*EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID[\s\S]*EXPO_PUBLIC_SUPABASE_URL/;
const sessionApiPortVariable = /EXPO_PUBLIC_DEV_SESSION_API_PORT/;
const supabasePublishableKeyVariable = /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/;
const supabaseUrlVariable = /EXPO_PUBLIC_SUPABASE_URL/;

const validEnv = {
  EXPO_PUBLIC_API_URL: "http://127.0.0.1:3900",
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: "123456789-ios.apps.googleusercontent.com",
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "123456789-web.apps.googleusercontent.com",
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
  EXPO_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
};

describe("parseMobileEnv", () => {
  test("모든 필수값이 올바르면 공백을 정리한 환경 설정을 반환한다", () => {
    expect(
      parseMobileEnv({
        ...validEnv,
        EXPO_PUBLIC_API_URL: `  ${validEnv.EXPO_PUBLIC_API_URL}  `,
      })
    ).toEqual(validEnv);
  });

  test("누락되거나 빈 모든 필수값의 이름을 한 오류에 담는다", () => {
    let error: unknown;

    try {
      parseMobileEnv({
        EXPO_PUBLIC_API_URL: "",
        EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: " ",
        EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: undefined,
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);

    const { message } = error as Error;

    expect(message).toMatch(envError);
    expect(message).toMatch(apiUrlVariable);
    expect(message).toMatch(googleIosClientIdVariable);
    expect(message).toMatch(googleWebClientIdVariable);
    expect(message).toMatch(supabasePublishableKeyVariable);
    expect(message).toMatch(supabaseUrlVariable);
  });

  test("잘못된 URL과 Google client ID를 함께 거절한다", () => {
    expect(() =>
      parseMobileEnv({
        ...validEnv,
        EXPO_PUBLIC_API_URL: "ftp://api.example.com",
        EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: "ios-client-id",
        EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "web-client-id",
        EXPO_PUBLIC_SUPABASE_URL: "127.0.0.1:54321",
      })
    ).toThrow(invalidFormattedVariables);
  });

  test("개발 세션 포트가 있으면 일반 URL보다 우선한다", () => {
    expect(
      parseMobileEnv({
        ...validEnv,
        EXPO_PUBLIC_DEV_SESSION_API_PORT: "3910",
        EXPO_PUBLIC_DEV_SESSION_SUPABASE_PORT: "54321",
      })
    ).toEqual({
      ...validEnv,
      EXPO_PUBLIC_API_URL: "http://127.0.0.1:3910",
      EXPO_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    });
  });

  test("개발 세션 포트가 없으면 일반 URL을 그대로 쓴다", () => {
    expect(parseMobileEnv(validEnv)).toEqual(validEnv);
  });

  test("포트가 아닌 값은 시작 전에 거절한다", () => {
    expect(() =>
      parseMobileEnv({
        ...validEnv,
        EXPO_PUBLIC_DEV_SESSION_API_PORT: "3910/api",
      })
    ).toThrow(sessionApiPortVariable);
  });
});

describe("developmentSessionHost", () => {
  test("Android Emulator는 10.0.2.2로 호스트에 닿는다", () => {
    expect(developmentSessionHost("android")).toBe("10.0.2.2");
  });

  test("iOS Simulator는 호스트의 loopback을 그대로 쓴다", () => {
    expect(developmentSessionHost("ios")).toBe("127.0.0.1");
  });

  // 개발 세션 스크립트처럼 번들 밖에서 부르면 값이 비어 있다.
  test("플랫폼이 없으면 loopback을 쓴다", () => {
    expect(developmentSessionHost(undefined)).toBe("127.0.0.1");
  });
});

describe("getMobileEnv", () => {
  test("프로세스의 개발 세션 포트를 이 플랫폼의 주소로 바꾼다", () => {
    const previousApiPort = process.env.EXPO_PUBLIC_DEV_SESSION_API_PORT;
    const previousSupabasePort =
      process.env.EXPO_PUBLIC_DEV_SESSION_SUPABASE_PORT;
    const host = developmentSessionHost(process.env.EXPO_OS);

    process.env.EXPO_PUBLIC_DEV_SESSION_API_PORT = "3910";
    process.env.EXPO_PUBLIC_DEV_SESSION_SUPABASE_PORT = "54321";

    try {
      expect(getMobileEnv()).toMatchObject({
        EXPO_PUBLIC_API_URL: `http://${host}:3910`,
        EXPO_PUBLIC_SUPABASE_URL: `http://${host}:54321`,
      });
    } finally {
      if (previousApiPort === undefined) {
        delete process.env.EXPO_PUBLIC_DEV_SESSION_API_PORT;
      } else {
        process.env.EXPO_PUBLIC_DEV_SESSION_API_PORT = previousApiPort;
      }

      if (previousSupabasePort === undefined) {
        delete process.env.EXPO_PUBLIC_DEV_SESSION_SUPABASE_PORT;
      } else {
        process.env.EXPO_PUBLIC_DEV_SESSION_SUPABASE_PORT =
          previousSupabasePort;
      }
    }
  });
});
