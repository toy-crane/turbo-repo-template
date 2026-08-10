import { afterEach, describe, expect, jest, test } from "@jest/globals";

const bothVariables =
  /EXPO_PUBLIC_SUPABASE_URL[\s\S]*EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY|EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY[\s\S]*EXPO_PUBLIC_SUPABASE_URL/;
const publishableKeyVariable = /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/;
const urlVariable = /EXPO_PUBLIC_SUPABASE_URL\b/;

const original = {
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
};

// Assigning undefined to process.env stores the string "undefined", which would
// pass a non-empty check and quietly weaken every "missing variable" case.
function setEnv(url?: string, publishableKey?: string) {
  if (url === undefined) {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  } else {
    process.env.EXPO_PUBLIC_SUPABASE_URL = url;
  }

  if (publishableKey === undefined) {
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  } else {
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = publishableKey;
  }
}

/**
 * A fresh module for each case: the client is created once and kept, so a
 * second call would never look at the environment again.
 */
function loadGetSupabaseClient() {
  let load: typeof import("./client").getSupabaseClient = () => {
    throw new Error("client module was not loaded");
  };

  jest.isolateModules(() => {
    load = (require("./client") as typeof import("./client")).getSupabaseClient;
  });

  return load;
}

afterEach(() => {
  setEnv(original.url, original.publishableKey);
});

describe("getSupabaseClient", () => {
  test("공개 URL과 publishable key가 모두 있으면 같은 client를 계속 쓴다", () => {
    setEnv("http://127.0.0.1:54321", "sb_publishable_local_key");

    const getSupabaseClient = loadGetSupabaseClient();

    expect(getSupabaseClient()).toBe(getSupabaseClient());
  });

  test("빠진 공개 환경 변수의 이름을 담은 초기화 오류를 낸다", () => {
    setEnv(undefined, undefined);

    expect(loadGetSupabaseClient()).toThrow(bothVariables);
  });

  test("설정된 변수는 오류 메시지에 넣지 않는다", () => {
    setEnv("http://127.0.0.1:54321", undefined);

    const getSupabaseClient = loadGetSupabaseClient();

    expect(getSupabaseClient).toThrow(publishableKeyVariable);
    expect(getSupabaseClient).not.toThrow(urlVariable);
  });

  test("빈 문자열을 설정된 값으로 받아들이지 않는다", () => {
    setEnv("", "  ");

    expect(loadGetSupabaseClient()).toThrow(bothVariables);
  });

  test("URL 형식이 아닌 값을 거절한다", () => {
    setEnv("127.0.0.1:54321", "sb_publishable_local_key");

    expect(loadGetSupabaseClient()).toThrow(urlVariable);
  });
});
