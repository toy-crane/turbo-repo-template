import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "@jest/globals";

const patchPath = resolve(
  process.cwd(),
  "../../patches/@expo%2Fui@57.0.9.patch"
);

describe("@expo/ui Android Switch patch", () => {
  test("label을 고대비 텍스트와 네이티브 접근성 이름으로 전달한다", () => {
    expect(existsSync(patchPath)).toBe(true);

    const patch = readFileSync(patchPath, "utf8");
    expect(patch).toContain('-    "publication": {');
    expect(patch).toContain("color={colors.onSurface}");
    expect(patch).toContain("accessibilityLabel={label}");
    expect(patch).toContain("val accessibilityLabel: String? = null");
    expect(patch).toContain("semantics(mergeDescendants = true)");
    expect(patch).toContain("contentDescription = it");
  });
});
