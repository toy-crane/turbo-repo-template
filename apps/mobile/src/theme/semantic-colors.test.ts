import { describe, expect, test } from "@jest/globals";

import { getSemanticColors } from "./semantic-colors";

describe("getSemanticColors", () => {
  test("light appearance에서 앱의 최초 시맨틱 색상을 선택한다", () => {
    expect(getSemanticColors("light")).toEqual({
      background: {
        canvas: "#F4F4F6",
        surface: "#FFFFFF",
      },
      text: {
        primary: "#111114",
      },
    });
  });

  test("dark appearance에서 앱의 최초 시맨틱 색상을 선택한다", () => {
    expect(getSemanticColors("dark")).toEqual({
      background: {
        canvas: "#0B0B0D",
        surface: "#1A1A1E",
      },
      text: {
        primary: "#FFFFFF",
      },
    });
  });

  test("scheme을 아직 확인하지 못했으면 light 색상을 사용한다", () => {
    expect(getSemanticColors(null)).toEqual(getSemanticColors("light"));
  });
});
