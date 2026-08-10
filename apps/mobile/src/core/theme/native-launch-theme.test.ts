import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "@jest/globals";

import appConfig from "../../../app.json";

// biome-ignore lint/correctness/noGlobalDirnameFilename: Jest transpiles this test as CommonJS.
const globalCss = readFileSync(join(__dirname, "../../../global.css"), "utf8");

describe("native launch theme", () => {
  test("네이티브 스플래시가 light와 dark 앱 배경을 각각 사용한다", () => {
    const splashPlugin = appConfig.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen"
    );

    expect(splashPlugin).toEqual([
      "expo-splash-screen",
      {
        backgroundColor: "#F4F4F6",
        dark: {
          backgroundColor: "#0B0B0D",
        },
        image: "./assets/splash-icon.png",
      },
    ]);
  });

  test("네이티브 스플래시 색상이 CSS canonical token의 build-time snapshot이다", () => {
    expect(globalCss).toContain("--background: #f4f4f6");
    expect(globalCss).toContain("--background: #0b0b0d");
  });

  test("iOS 네이티브 모듈이 React Native 소스 빌드와 함께 링크된다", () => {
    const buildPropertiesPlugin = appConfig.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === "expo-build-properties"
    );

    expect(buildPropertiesPlugin).toEqual([
      "expo-build-properties",
      {
        ios: {
          buildReactNativeFromSource: true,
        },
      },
    ]);
  });
});
