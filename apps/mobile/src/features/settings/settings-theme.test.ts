import { describe, expect, test } from "@jest/globals";

import { getSettingsTextStyle } from "./settings-theme";

describe("getSettingsTextStyle", () => {
  test("Android 설정 텍스트가 시스템 appearance에 맞는 고대비 색상을 사용한다", () => {
    expect(getSettingsTextStyle("#111114")).toEqual({
      color: "#111114",
    });
    expect(getSettingsTextStyle("#FFFFFF")).toEqual({
      color: "#FFFFFF",
    });
  });
});
