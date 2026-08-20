import { describe, expect, test } from "bun:test";
import { realpathSync } from "node:fs";
import { join } from "node:path";

import { run } from "./command";

const REPOSITORY_ROOT = join(import.meta.dir, "../../..");
const MOBILE_DIRECTORY = join(REPOSITORY_ROOT, "apps", "mobile");

interface AutolinkingModule {
  packageName?: unknown;
  projects?: Array<{ sourceDir?: unknown }>;
}

describe("Expo autolinking", () => {
  test("@expo/dom-webview를 앱의 직접 의존성 경로로 고정한다", async () => {
    const result = await run(
      [
        join(
          MOBILE_DIRECTORY,
          "node_modules",
          ".bin",
          "expo-modules-autolinking"
        ),
        "resolve",
        "--platform",
        "android",
        "--json",
      ],
      { cwd: MOBILE_DIRECTORY }
    );

    if (result.code !== 0) {
      throw new Error(result.stderr || result.stdout);
    }

    const config = JSON.parse(result.stdout) as {
      modules?: AutolinkingModule[];
    };
    const sourceDir = config.modules
      ?.find((module) => module.packageName === "@expo/dom-webview")
      ?.projects?.at(0)?.sourceDir;

    expect(typeof sourceDir).toBe("string");

    if (typeof sourceDir !== "string") {
      throw new Error(
        "@expo/dom-webview의 Android sourceDir를 찾지 못했습니다."
      );
    }

    expect(realpathSync(sourceDir)).toBe(
      realpathSync(
        join(
          MOBILE_DIRECTORY,
          "node_modules",
          "@expo",
          "dom-webview",
          "android"
        )
      )
    );
  });
});
