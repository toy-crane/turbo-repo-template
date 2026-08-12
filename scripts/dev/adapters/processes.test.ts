import { describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:net";

import { isInside, isPortFree, isProcessAlive } from "./processes";

function listenOnFreePort(): Promise<{ port: number; server: Server }> {
  return new Promise((resolve) => {
    const server = createServer();

    server.listen({ host: "0.0.0.0", port: 0 }, () => {
      const address = server.address();

      resolve({
        port: typeof address === "object" && address ? address.port : 0,
        server,
      });
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
  });
}

const WORKTREE = "/repo/.worktrees/feature";

describe("isInside", () => {
  test("자기 폴더와 그 아래 경로만 소유로 본다", () => {
    expect(isInside(WORKTREE, WORKTREE)).toBe(true);
    expect(isInside(`${WORKTREE}/apps/mobile`, WORKTREE)).toBe(true);
  });

  test("이름이 앞부분만 같은 다른 worktree는 소유가 아니다", () => {
    // 이 구분이 없으면 feature의 종료 명령이 feature-2의 Metro를 죽인다.
    expect(isInside(`${WORKTREE}-2`, WORKTREE)).toBe(false);
    expect(isInside(`${WORKTREE}-2/apps/api`, WORKTREE)).toBe(false);
  });

  test("바깥 경로는 소유가 아니다", () => {
    expect(isInside("/repo", WORKTREE)).toBe(false);
    expect(isInside("", WORKTREE)).toBe(false);
  });
});

describe("isProcessAlive", () => {
  test("자기 자신은 살아 있다", () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  test("PID가 될 수 없는 값은 죽은 것으로 본다", () => {
    expect(isProcessAlive(0)).toBe(false);
    expect(isProcessAlive(-1)).toBe(false);
    expect(isProcessAlive(Number.NaN)).toBe(false);
  });
});

describe("isPortFree", () => {
  test("듣고 있는 포트는 비어 있지 않다고 답한다", async () => {
    const { port, server } = await listenOnFreePort();

    try {
      expect(await isPortFree(port)).toBe(false);
    } finally {
      await close(server);
    }
  });

  test("아무도 없는 포트는 비어 있다고 답한다", async () => {
    const { port, server } = await listenOnFreePort();

    await close(server);

    expect(await isPortFree(port)).toBe(true);
  });
});
