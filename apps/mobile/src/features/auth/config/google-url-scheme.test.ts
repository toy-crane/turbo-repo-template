import { describe, expect, test } from "@jest/globals";

import { toIosUrlScheme } from "./google-url-scheme";

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
});
