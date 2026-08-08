import { describe, expect, test } from "@jest/globals";

import { getSettingsSheetOptions } from "./settings-sheet";

describe("getSettingsSheetOptions", () => {
  test("Settings를 native page sheet로 연다", () => {
    expect(getSettingsSheetOptions()).toEqual({
      headerBackVisible: false,
      headerShadowVisible: false,
      headerShown: true,
      headerTransparent: true,
      presentation: "pageSheet",
      title: "Settings",
    });
  });
});
