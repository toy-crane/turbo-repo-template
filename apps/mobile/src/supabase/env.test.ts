import { describe, expect, test } from "@jest/globals";

import { resolveSupabaseEnv } from "./env";

const bothVariables =
  /EXPO_PUBLIC_SUPABASE_URL[\s\S]*EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/;
const publishableKeyVariable = /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/;
const urlVariable = /EXPO_PUBLIC_SUPABASE_URL\b/;

describe("resolveSupabaseEnv", () => {
  test("공개 URL과 publishable key가 모두 있으면 client 설정을 돌려준다", () => {
    expect(
      resolveSupabaseEnv({
        publishableKey: "sb_publishable_local_key",
        url: "http://127.0.0.1:54321",
      })
    ).toEqual({
      publishableKey: "sb_publishable_local_key",
      url: "http://127.0.0.1:54321",
    });
  });

  test("빠진 공개 환경 변수의 이름을 담은 초기화 오류를 낸다", () => {
    expect(() =>
      resolveSupabaseEnv({ publishableKey: undefined, url: undefined })
    ).toThrow(bothVariables);
  });

  test("설정된 변수는 오류 메시지에 넣지 않는다", () => {
    const resolveWithoutKey = () =>
      resolveSupabaseEnv({
        publishableKey: undefined,
        url: "http://127.0.0.1:54321",
      });

    expect(resolveWithoutKey).toThrow(publishableKeyVariable);
    expect(resolveWithoutKey).not.toThrow(urlVariable);
  });

  test("빈 문자열을 설정된 값으로 받아들이지 않는다", () => {
    expect(() => resolveSupabaseEnv({ publishableKey: "  ", url: "" })).toThrow(
      bothVariables
    );
  });
});
