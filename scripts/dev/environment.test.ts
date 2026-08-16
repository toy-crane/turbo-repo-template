import { describe, expect, test } from "bun:test";

import {
  buildMobileEnvironment,
  developmentClientUrl,
  mobileEnvironmentFingerprint,
  parseEnvFile,
} from "./environment";

const iosClientIdMessage = /EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID/;
const webClientIdMessage = /EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/;
const PORTS = { api: 3910, supabase: 54_321 };

const FILE_VALUES = {
  EXPO_PUBLIC_API_URL: "http://127.0.0.1:3900",
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: "123-ios.apps.googleusercontent.com",
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "123-web.apps.googleusercontent.com",
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  EXPO_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
};

describe("buildMobileEnvironment", () => {
  test("일반 URL을 보존하고 개발 세션 전용 포트를 추가한다", () => {
    const env = buildMobileEnvironment({
      fileValues: FILE_VALUES,
      ports: PORTS,
    });

    expect(env.EXPO_PUBLIC_API_URL).toBe(FILE_VALUES.EXPO_PUBLIC_API_URL);
    expect(env.EXPO_PUBLIC_SUPABASE_URL).toBe(
      FILE_VALUES.EXPO_PUBLIC_SUPABASE_URL
    );
    expect(env.EXPO_PUBLIC_DEV_SESSION_API_PORT).toBe("3910");
    expect(env.EXPO_PUBLIC_DEV_SESSION_SUPABASE_PORT).toBe("54321");
    expect(env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID).toBe(
      FILE_VALUES.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    );
    expect(env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe(
      FILE_VALUES.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    );
  });

  // The environment Metro receives must not name a platform: one Metro bundles
  // for both, and the app turns the port into an address its platform reaches.
  test("세션 값에 호스트를 넣지 않는다", () => {
    const env = buildMobileEnvironment({
      fileValues: FILE_VALUES,
      ports: PORTS,
    });

    expect(env.EXPO_PUBLIC_DEV_SESSION_API_PORT).not.toContain(".");
    expect(env.EXPO_PUBLIC_DEV_SESSION_SUPABASE_PORT).not.toContain(".");
  });

  test(".env.local에 없는 필수 값은 앱 스키마로 걸러낸다", () => {
    const { EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, ...missing } = FILE_VALUES;

    expect(() =>
      buildMobileEnvironment({ fileValues: missing, ports: PORTS })
    ).toThrow(iosClientIdMessage);
  });

  test("형식이 잘못된 값도 시작 전에 걸러낸다", () => {
    expect(() =>
      buildMobileEnvironment({
        fileValues: {
          ...FILE_VALUES,
          EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "nope",
        },
        ports: PORTS,
      })
    ).toThrow(webClientIdMessage);
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
