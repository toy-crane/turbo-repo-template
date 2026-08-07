import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "@jest/globals";

const patchPath = resolve(
  process.cwd(),
  "../../patches/expo-symbols@57.0.2.patch"
);

describe("expo-symbols Android patch", () => {
  test("고정 크기 아이콘에서 시스템 글자 배율을 비활성화한다", () => {
    expect(existsSync(patchPath)).toBe(true);

    const patch = readFileSync(patchPath, "utf8");
    expect(patch).toContain("allowFontScaling={false}");
    expect(patch).toContain("allowFontScaling: false");
  });
});
