import { describe, expect, test } from "@jest/globals";

import { getGlassTabTheme } from "./glass-tab-theme";

describe("getGlassTabTheme", () => {
  test("light appearance에서 canvas 색의 밝은 edge blur를 사용한다", () => {
    expect(getGlassTabTheme("light")).toMatchObject({
      blurOverlay:
        "linear-gradient(to top, rgba(244,244,246,0.88) 0%, rgba(244,244,246,0.46) 42%, rgba(244,244,246,0.14) 68%, rgba(244,244,246,0) 88%)",
      blurTint: "light",
    });
  });
});
