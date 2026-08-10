import { describe, expect, test } from "@jest/globals";

import { getTabStackRouteOptions, getTabStackScreenOptions } from "./tab-stack";

describe("getTabStackScreenOptions", () => {
  test("iOS 26 Large Title을 가리지 않도록 header 배경을 직접 지정하지 않는다", () => {
    const options = getTabStackScreenOptions(
      { background: "#F4F4F6", foreground: "#111114" },
      "ios"
    );

    expect(options).not.toHaveProperty("headerStyle");
    expect(options).toMatchObject({
      headerLargeTitleStyle: { color: "#111114" },
    });
  });

  test("Android App Bar에는 appearance에 맞는 배경을 지정한다", () => {
    expect(
      getTabStackScreenOptions(
        { background: "#0B0B0D", foreground: "#FFFFFF" },
        "android"
      )
    ).toMatchObject({
      headerStyle: { backgroundColor: "#0B0B0D" },
    });
  });

  test("현재 native Stack Large Title 옵션을 사용한다", () => {
    expect(getTabStackRouteOptions("Home")).toEqual({
      headerLargeTitleEnabled: true,
      title: "Home",
    });
  });
});
