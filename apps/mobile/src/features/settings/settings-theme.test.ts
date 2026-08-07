import { describe, expect, test } from "@jest/globals";

import { getSemanticColors } from "../../theme/semantic-colors";
import { getSettingsTextStyle } from "./settings-theme";

describe("getSettingsTextStyle", () => {
  test("Android 설정 텍스트가 시스템 appearance에 맞는 고대비 색상을 사용한다", () => {
    expect(getSettingsTextStyle(getSemanticColors("light"))).toEqual({
      color: "#111114",
    });
    expect(getSettingsTextStyle(getSemanticColors("dark"))).toEqual({
      color: "#FFFFFF",
    });
  });
});
