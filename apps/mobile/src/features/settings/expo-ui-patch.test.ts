import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "@jest/globals";

const patchPath = resolve(
  process.cwd(),
  "../../patches/@expo%2Fui@57.0.9.patch"
);

describe("@expo/ui universal Switch patch", () => {
  test("보이는 label과 분리된 접근성 이름을 양 플랫폼 네이티브 switch에 전달한다", () => {
    expect(existsSync(patchPath)).toBe(true);

    const patch = readFileSync(patchPath, "utf8");
    expect(patch).toContain('-    "publication": {');
    expect(patch).toContain("color={colors.onSurface}");
    expect(patch).toContain(
      "accessibilityLabel={accessibilityLabel ?? label}"
    );
    expect(patch).toContain(
      "accessibilityLabelMod(accessibilityLabel)"
    );
    expect(patch).toContain(
      "Accessibility label announced for the switch without rendering visible text."
    );
    expect(patch).toContain("val accessibilityLabel: String? = null");
    expect(patch).toContain("semantics(mergeDescendants = true)");
    expect(patch).toContain("contentDescription = it");
  });
});
