import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { withLock } from "./lock";

const lockTimeoutMessage = /잠금을 기다리다 시간이 지났습니다/;

let root = "";
let lockDirectory = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "dev-lock-"));
  lockDirectory = join(root, "state.lock");
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("withLock", () => {
  test("끝나면 잠금을 푼다", async () => {
    await withLock(lockDirectory, () => undefined);

    expect(existsSync(lockDirectory)).toBe(false);
  });

  test("상태 폴더가 아직 없어도 첫 실행이 잠금을 잡는다", async () => {
    const nested = join(root, "새", "폴더", "state.lock");

    expect(await withLock(nested, () => "지나감")).toBe("지나감");
    expect(existsSync(nested)).toBe(false);
  });

  test("실패해도 잠금을 푼다", async () => {
    await expect(
      withLock(lockDirectory, () => {
        throw new Error("실패");
      })
    ).rejects.toThrow("실패");

    expect(existsSync(lockDirectory)).toBe(false);
  });

  test("동시에 들어온 배정이 서로 겹치지 않는다", async () => {
    const taken: number[] = [];
    // 잠금이 없으면 두 실행이 같은 값을 읽고 같은 slot을 가져간다.
    const allocate = () =>
      withLock(lockDirectory, async () => {
        const next = taken.length;

        await new Promise((resolve) => {
          setTimeout(resolve, 5);
        });

        taken.push(next);

        return next;
      });

    const slots = await Promise.all([
      allocate(),
      allocate(),
      allocate(),
      allocate(),
    ]);

    expect([...slots].sort()).toEqual([0, 1, 2, 3]);
  });

  test("죽은 프로세스가 남긴 잠금은 넘어간다", async () => {
    mkdirSync(lockDirectory, { recursive: true });
    writeFileSync(
      join(lockDirectory, "owner.json"),
      JSON.stringify({ pid: 999_999, startedAt: Date.now() })
    );

    const result = await withLock(lockDirectory, () => "지나감", {
      isProcessAlive: () => false,
      timeoutMs: 200,
    });

    expect(result).toBe("지나감");
  });

  test("주인 파일이 없는 잠금도 넘어간다", async () => {
    mkdirSync(lockDirectory, { recursive: true });

    const result = await withLock(lockDirectory, () => "지나감", {
      timeoutMs: 200,
    });

    expect(result).toBe("지나감");
  });

  test("살아 있는 프로세스의 잠금은 기다리다 시간이 지나면 알린다", async () => {
    mkdirSync(lockDirectory, { recursive: true });
    writeFileSync(
      join(lockDirectory, "owner.json"),
      JSON.stringify({ pid: 4321, startedAt: Date.now() })
    );

    await expect(
      withLock(lockDirectory, () => undefined, {
        isProcessAlive: () => true,
        timeoutMs: 150,
      })
    ).rejects.toThrow(lockTimeoutMessage);

    // 남의 잠금을 지우지 않는다.
    expect(existsSync(lockDirectory)).toBe(true);
  });
});
