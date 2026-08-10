import { describe, expect, jest, test } from "@jest/globals";

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

describe("getSupabaseClient", () => {
  test("공개 URL과 publishable key가 모두 있으면 같은 client를 계속 쓴다", () => {
    const getSupabaseClient = loadGetSupabaseClient();

    expect(getSupabaseClient()).toBe(getSupabaseClient());
  });
});
