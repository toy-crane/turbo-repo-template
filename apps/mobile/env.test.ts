import { describe, expect, test } from "@jest/globals";

import { getMobileEnv, parseMobileEnv } from "./env";

const envError = /^Invalid mobile environment variables:/;
const apiUrlVariable = /EXPO_PUBLIC_API_URL/;
const googleIosClientIdVariable = /EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID/;
const googleWebClientIdVariable = /EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/;
const invalidFormattedVariables =
  /EXPO_PUBLIC_API_URL[\s\S]*EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID[\s\S]*EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID[\s\S]*EXPO_PUBLIC_SUPABASE_URL/;
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

  test("개발 세션 URL이 있으면 일반 URL보다 우선한다", () => {
    expect(
      parseMobileEnv({
        ...validEnv,
        EXPO_PUBLIC_DEV_SESSION_API_URL: "http://10.0.2.2:3910",
        EXPO_PUBLIC_DEV_SESSION_SUPABASE_URL: "http://10.0.2.2:54321",
      })
    ).toEqual({
      ...validEnv,
      EXPO_PUBLIC_API_URL: "http://10.0.2.2:3910",
      EXPO_PUBLIC_SUPABASE_URL: "http://10.0.2.2:54321",
    });
  });
});

describe("getMobileEnv", () => {
  test("프로세스의 개발 세션 URL을 앱이 쓰는 URL로 선택한다", () => {
    const previousApiUrl = process.env.EXPO_PUBLIC_DEV_SESSION_API_URL;
    const previousSupabaseUrl =
      process.env.EXPO_PUBLIC_DEV_SESSION_SUPABASE_URL;

    process.env.EXPO_PUBLIC_DEV_SESSION_API_URL = "http://10.0.2.2:3910";
    process.env.EXPO_PUBLIC_DEV_SESSION_SUPABASE_URL = "http://10.0.2.2:54321";

    try {
      expect(getMobileEnv()).toMatchObject({
        EXPO_PUBLIC_API_URL: "http://10.0.2.2:3910",
        EXPO_PUBLIC_SUPABASE_URL: "http://10.0.2.2:54321",
      });
    } finally {
      if (previousApiUrl === undefined) {
        delete process.env.EXPO_PUBLIC_DEV_SESSION_API_URL;
      } else {
        process.env.EXPO_PUBLIC_DEV_SESSION_API_URL = previousApiUrl;
      }

      if (previousSupabaseUrl === undefined) {
        delete process.env.EXPO_PUBLIC_DEV_SESSION_SUPABASE_URL;
      } else {
        process.env.EXPO_PUBLIC_DEV_SESSION_SUPABASE_URL = previousSupabaseUrl;
      }
    }
  });
});
