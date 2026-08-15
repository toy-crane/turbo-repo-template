import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { repositoryPaths, worktreeLogDirectory } from "../paths";
import type { SessionContext } from "./context";
import { driverFor } from "./platform";

function sessionContext(worktreePath: string): SessionContext {
  return {
    apiDirectory: join(worktreePath, "apps", "api"),
    git: {
      commonDirectory: "/repo/.git",
      label: "test",
      worktreePath,
    },
    mobileDirectory: join(worktreePath, "apps", "mobile"),
    paths: repositoryPaths("/repo/.git", "/cache"),
    project: {
      androidPackage: "com.example.app",
      bundleIdentifier: "com.example.app",
      scheme: "example",
      slug: "example",
    },
    supabasePort: 54_321,
  };
}

describe("Android Development Build 환경", () => {
  test("각 worktree가 전용 Gradle 홈을 사용한다", () => {
    const first = sessionContext("/repo");
    const second = sessionContext("/repo-feature");
    const inherited = {
      GRADLE_OPTS: "-Dfile.encoding=UTF-8",
      GRADLE_USER_HOME: "/Users/developer/.gradle",
    };
    const firstEnvironment = driverFor(first, "android").buildEnv(inherited);
    const secondEnvironment = driverFor(second, "android").buildEnv(inherited);

    expect(firstEnvironment.GRADLE_USER_HOME).toBe(
      join(
        worktreeLogDirectory(first.paths, first.git.worktreePath),
        "gradle-home"
      )
    );
    expect(secondEnvironment.GRADLE_USER_HOME).toBe(
      join(
        worktreeLogDirectory(second.paths, second.git.worktreePath),
        "gradle-home"
      )
    );
    expect(firstEnvironment.GRADLE_USER_HOME).not.toBe(
      secondEnvironment.GRADLE_USER_HOME
    );
    expect(firstEnvironment.GRADLE_OPTS).toBe(
      "-Dfile.encoding=UTF-8 -Dorg.gradle.daemon=false"
    );
    expect(secondEnvironment.GRADLE_OPTS).toBe(
      "-Dfile.encoding=UTF-8 -Dorg.gradle.daemon=false"
    );
    expect(inherited.GRADLE_OPTS).toBe("-Dfile.encoding=UTF-8");
    expect(inherited.GRADLE_USER_HOME).toBe("/Users/developer/.gradle");
  });
});
