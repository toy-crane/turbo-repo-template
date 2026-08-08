import { describe, expect, test } from "@jest/globals";

import { getSettingsSheetOptions } from "./settings-sheet";

describe("getSettingsSheetOptions", () => {
  test("Settings를 가장 큰 native form sheet detent로 연다", () => {
    expect(getSettingsSheetOptions()).toMatchObject({
      headerShown: true,
      presentation: "formSheet",
      sheetAllowedDetents: [0.5, 1],
      sheetGrabberVisible: true,
      sheetInitialDetentIndex: "last",
      title: "Settings",
    });
  });
});
