import { describe, expect, test } from "@jest/globals";

import appConfig from "../../app.json";
import { getSemanticColors } from "./semantic-colors";

describe("native launch theme", () => {
  test("네이티브 스플래시가 light와 dark 앱 배경을 각각 사용한다", () => {
    const splashPlugin = appConfig.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen"
    );

    expect(splashPlugin).toEqual([
      "expo-splash-screen",
      {
        backgroundColor: getSemanticColors("light").background.canvas,
        dark: {
          backgroundColor: getSemanticColors("dark").background.canvas,
        },
        image: "./assets/splash-icon.png",
      },
    ]);
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
