import { afterEach, describe, expect, test } from "bun:test";
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  metroInputFingerprint,
  readMetroInputFingerprint,
  writeMetroInputFingerprint,
} from "./metro-cache";
import { repositoryPaths, worktreeMetroPaths } from "./paths";

const temporaryDirectories: string[] = [];

function createWorktree(): string {
  const root = mkdtempSync(join(tmpdir(), "metro-cache-test-"));
  const mobile = join(root, "apps", "mobile");

  temporaryDirectories.push(root);
  mkdirSync(join(root, "patches"), { recursive: true });
  mkdirSync(join(mobile, "node_modules", "expo"), { recursive: true });
  mkdirSync(
    join(
      mobile,
      "node_modules",
      "expo",
      "node_modules",
      "@expo",
      "metro-config"
    ),
    { recursive: true }
  );

  for (const relativePath of [
    "bun.lock",
    "package.json",
    "apps/mobile/package.json",
    "apps/mobile/metro.config.js",
    "apps/mobile/babel.config.js",
    "apps/mobile/app.config.ts",
    "apps/mobile/app.json",
    "apps/mobile/env.ts",
    "apps/mobile/src/features/auth/config/google-url-scheme.ts",
    "apps/mobile/tsconfig.json",
  ]) {
    const path = join(root, relativePath);

    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${relativePath}\n`);
  }

  writeFileSync(
    join(mobile, "node_modules", "expo", "package.json"),
    '{"version":"57.0.0"}\n'
  );
  writeFileSync(
    join(
      mobile,
      "node_modules",
      "expo",
      "node_modules",
      "@expo",
      "metro-config",
      "package.json"
    ),
    '{"version":"57.0.8"}\n'
  );
  writeFileSync(join(root, "patches", "metro.patch"), "patch-v1\n");

  return root;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("metroInputFingerprint", () => {
  test("입력이 같으면 같은 fingerprint를 만든다", () => {
    const worktree = createWorktree();

    expect(metroInputFingerprint(worktree)).toBe(
      metroInputFingerprint(worktree)
    );
  });

  test("의존성과 Metro 설정 입력이 바뀌면 fingerprint가 바뀐다", () => {
    const worktree = createWorktree();
    const inputs = [
      "bun.lock",
      "package.json",
      "apps/mobile/package.json",
      "apps/mobile/metro.config.js",
      "apps/mobile/babel.config.js",
      "apps/mobile/app.config.ts",
      "apps/mobile/app.json",
      "apps/mobile/env.ts",
      "apps/mobile/src/features/auth/config/google-url-scheme.ts",
      "apps/mobile/tsconfig.json",
      "patches/metro.patch",
    ];

    for (const input of inputs) {
      const before = metroInputFingerprint(worktree);

      appendFileSync(join(worktree, input), "changed\n");
      expect(metroInputFingerprint(worktree)).not.toBe(before);
    }
  });

  test("설치된 주요 모바일 패키지 버전이 바뀌면 fingerprint가 바뀐다", () => {
    const worktree = createWorktree();
    const before = metroInputFingerprint(worktree);

    writeFileSync(
      join(worktree, "apps", "mobile", "node_modules", "expo", "package.json"),
      '{"version":"57.0.1"}\n'
    );

    expect(metroInputFingerprint(worktree)).not.toBe(before);
  });

  test("Expo가 실제로 불러오는 Metro config 버전을 감지한다", () => {
    const worktree = createWorktree();
    const before = metroInputFingerprint(worktree);

    writeFileSync(
      join(
        worktree,
        "apps",
        "mobile",
        "node_modules",
        "expo",
        "node_modules",
        "@expo",
        "metro-config",
        "package.json"
      ),
      '{"version":"57.0.9"}\n'
    );

    expect(metroInputFingerprint(worktree)).not.toBe(before);
  });
});

describe("Metro fingerprint 저장", () => {
  test("없는 값은 null로 읽고 저장한 값을 다시 읽는다", () => {
    const root = createWorktree();
    const path = join(root, "cache", "inputs.sha256");

    expect(readMetroInputFingerprint(path)).toBeNull();

    writeMetroInputFingerprint(path, "fingerprint");

    expect(readMetroInputFingerprint(path)).toBe("fingerprint");
  });
});

describe("worktreeMetroPaths", () => {
  test("worktree마다 다른 TMPDIR를 두고 fingerprint는 그 밖에 둔다", () => {
    const cacheRoot = createWorktree();
    const paths = repositoryPaths("/repo/.git", cacheRoot);
    const first = worktreeMetroPaths(paths, "/repo");
    const second = worktreeMetroPaths(paths, "/repo-worktree");

    expect(first.tmpDirectory).not.toBe(second.tmpDirectory);
    expect(dirname(first.fingerprintPath)).toBe(dirname(first.tmpDirectory));
    expect(first.fingerprintPath.startsWith(first.tmpDirectory)).toBe(false);
  });
});
