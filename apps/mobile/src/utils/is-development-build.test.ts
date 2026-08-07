import { describe, expect, test } from "@jest/globals";

import { hasDevelopmentBuildEvidence } from "./is-development-build";

describe("hasDevelopmentBuildEvidence", () => {
  test("개발 모드와 네이티브 Dev Launcher가 모두 있으면 검증한다", () => {
    expect(
      hasDevelopmentBuildEvidence({
        hasDevLauncher: true,
        isDevelopmentMode: true,
      })
    ).toBe(true);
  });

  test.each([
    { hasDevLauncher: false, isDevelopmentMode: true },
    { hasDevLauncher: true, isDevelopmentMode: false },
    { hasDevLauncher: false, isDevelopmentMode: false },
  ])("증거가 부족하면 검증하지 않는다: %o", (evidence) => {
    expect(hasDevelopmentBuildEvidence(evidence)).toBe(false);
  });
});
