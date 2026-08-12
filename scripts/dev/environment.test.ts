import { describe, expect, test } from "bun:test";

import {
  buildMobileEnvironment,
  developmentClientUrl,
  mobileEnvironmentFingerprint,
  parseEnvFile,
  sessionAddresses,
} from "./environment";

const iosClientIdMessage = /EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID/;
const sessionApiUrlMessage = /EXPO_PUBLIC_DEV_SESSION_API_URL/;
const webClientIdMessage = /EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/;

const FILE_VALUES = {
  EXPO_PUBLIC_API_URL: "http://127.0.0.1:3900",
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: "123-ios.apps.googleusercontent.com",
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "123-web.apps.googleusercontent.com",
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  EXPO_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
};

describe("sessionAddresses", () => {
  test("iOS Simulator는 loopback 주소를 쓴다", () => {
    expect(sessionAddresses("ios", 3910, 54_321)).toEqual({
      apiUrl: "http://127.0.0.1:3910",
      supabaseUrl: "http://127.0.0.1:54321",
    });
  });

  test("Android Emulator는 10.0.2.2로 호스트에 닿는다", () => {
    expect(sessionAddresses("android", 3920, 54_321)).toEqual({
      apiUrl: "http://10.0.2.2:3920",
      supabaseUrl: "http://10.0.2.2:54321",
    });
  });
});

describe("buildMobileEnvironment", () => {
  test("일반 URL을 보존하고 개발 세션 전용 URL을 추가한다", () => {
    const env = buildMobileEnvironment({
      addresses: sessionAddresses("android", 3910, 54_321),
      fileValues: FILE_VALUES,
    });

    expect(env.EXPO_PUBLIC_API_URL).toBe(FILE_VALUES.EXPO_PUBLIC_API_URL);
    expect(env.EXPO_PUBLIC_SUPABASE_URL).toBe(
      FILE_VALUES.EXPO_PUBLIC_SUPABASE_URL
    );
    expect(env.EXPO_PUBLIC_DEV_SESSION_API_URL).toBe("http://10.0.2.2:3910");
    expect(env.EXPO_PUBLIC_DEV_SESSION_SUPABASE_URL).toBe(
      "http://10.0.2.2:54321"
    );
    expect(env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID).toBe(
      FILE_VALUES.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    );
    expect(env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe(
      FILE_VALUES.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    );
  });

  test(".env.local에 없는 필수 값은 앱 스키마로 걸러낸다", () => {
    const { EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, ...missing } = FILE_VALUES;

    expect(() =>
      buildMobileEnvironment({
        addresses: sessionAddresses("ios", 3900, 54_321),
        fileValues: missing,
      })
    ).toThrow(iosClientIdMessage);
  });

  test("형식이 잘못된 값도 시작 전에 걸러낸다", () => {
    expect(() =>
      buildMobileEnvironment({
        addresses: sessionAddresses("ios", 3900, 54_321),
        fileValues: {
          ...FILE_VALUES,
          EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "nope",
        },
      })
    ).toThrow(webClientIdMessage);
  });

  test("형식이 잘못된 개발 세션 URL도 시작 전에 걸러낸다", () => {
    expect(() =>
      buildMobileEnvironment({
        addresses: {
          apiUrl: "ftp://10.0.2.2:3910",
          supabaseUrl: "http://10.0.2.2:54321",
        },
        fileValues: FILE_VALUES,
      })
    ).toThrow(sessionApiUrlMessage);
  });
});

describe("mobileEnvironmentFingerprint", () => {
  test("키 순서가 달라도 같은 환경은 같은 fingerprint를 만든다", () => {
    const first = mobileEnvironmentFingerprint(
      Object.fromEntries([
        ["B", "2"],
        ["A", "1"],
      ])
    );
    const second = mobileEnvironmentFingerprint({ A: "1", B: "2" });

    expect(first).toBe(second);
  });

  test("환경 값이 달라지면 fingerprint도 달라진다", () => {
    expect(mobileEnvironmentFingerprint({ A: "1" })).not.toBe(
      mobileEnvironmentFingerprint({ A: "2" })
    );
  });
});

describe("parseEnvFile", () => {
  test("주석, 빈 줄과 따옴표를 처리한다", () => {
    const values = parseEnvFile(
      [
        "# 주석",
        "",
        "EXPO_PUBLIC_API_URL=http://127.0.0.1:3900",
        'QUOTED="값 그대로"',
        "SINGLE='작은 따옴표'",
        "export EXPORTED=yes",
        "TRAILING=value # 뒤 주석",
        "빈줄아님",
      ].join("\n")
    );

    expect(values).toEqual({
      EXPO_PUBLIC_API_URL: "http://127.0.0.1:3900",
      EXPORTED: "yes",
      QUOTED: "값 그대로",
      SINGLE: "작은 따옴표",
      TRAILING: "value",
    });
  });

  test("빈 값은 빈 문자열로 남긴다", () => {
    expect(parseEnvFile("EMPTY=\n")).toEqual({ EMPTY: "" });
  });
});

describe("developmentClientUrl", () => {
  test("현재 Metro 포트를 담은 development client 주소를 만든다", () => {
    expect(developmentClientUrl("turbo-repo-mobile", 8091)).toBe(
      "turbo-repo-mobile://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091"
    );
  });
});
