import { afterEach, describe, expect, test } from "@jest/globals";

import { resolveGoogleEnv, toIosUrlScheme } from "./google-env";

const iosClientIdVariable = /EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID/;

const original = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

// Assigning undefined to process.env stores the string "undefined", which would
// pass a non-empty check and quietly weaken every "missing variable" case.
function setEnv(webClientId?: string, iosClientId?: string) {
  if (webClientId === undefined) {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = undefined;
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  } else {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = webClientId;
  }

  if (iosClientId === undefined) {
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = undefined;
    delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  } else {
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = iosClientId;
  }
}

afterEach(() => {
  setEnv(original.webClientId, original.iosClientId);
});

describe("resolveGoogleEnv", () => {
  test("설정된 client ID를 돌려준다", () => {
    setEnv("web.apps.googleusercontent.com", "ios.apps.googleusercontent.com");

    expect(resolveGoogleEnv()).toEqual({
      iosClientId: "ios.apps.googleusercontent.com",
      webClientId: "web.apps.googleusercontent.com",
    });
  });

  test("설정하지 않아도 앱을 세우지 않는다", () => {
    setEnv(undefined, undefined);

    expect(resolveGoogleEnv()).toEqual({
      iosClientId: undefined,
      webClientId: undefined,
    });
  });

  test("빈 문자열을 설정된 값으로 받아들이지 않는다", () => {
    setEnv("  ", "");

    expect(resolveGoogleEnv()).toEqual({
      iosClientId: undefined,
      webClientId: undefined,
    });
  });
});

describe("toIosUrlScheme", () => {
  test("iOS client ID를 뒤집은 URL scheme으로 바꾼다", () => {
    expect(toIosUrlScheme("123-abc.apps.googleusercontent.com")).toBe(
      "com.googleusercontent.apps.123-abc"
    );
  });

  test("앞뒤 공백을 무시한다", () => {
    expect(toIosUrlScheme("  123-abc.apps.googleusercontent.com  ")).toBe(
      "com.googleusercontent.apps.123-abc"
    );
  });

  test("iOS client ID가 아닌 값은 어느 변수가 잘못됐는지 알려준다", () => {
    expect(() => toIosUrlScheme("123-abc")).toThrow(iosClientIdVariable);
  });
});
