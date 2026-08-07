import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "@jest/globals";

const turboConfigPath = resolve(process.cwd(), "../../turbo.json");

describe("Turbo dependency patch inputs", () => {
  test("패치 내용이 바뀌면 캐시된 모바일 작업을 무효화한다", () => {
    const turboConfig = JSON.parse(readFileSync(turboConfigPath, "utf8")) as {
      globalDependencies?: string[];
    };

    expect(turboConfig.globalDependencies).toContain("patches/**");
  });
});
