import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const OWNER_FILE = "owner.json";
const RETRY_INTERVAL_MS = 100;
// Long enough for the holder to finish a reclaim, which shuts down and erases
// every device a removed worktree left behind.
const DEFAULT_TIMEOUT_MS = 180_000;

export interface LockOptions {
  /** Answers "is the process holding this lock still running?". */
  isProcessAlive?: (pid: number) => boolean;
  timeoutMs?: number;
}

interface LockOwner {
  pid: number;
  startedAt: number;
}

function defaultIsProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);

    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function readOwner(lockDirectory: string): LockOwner | undefined {
  try {
    const raw: unknown = JSON.parse(
      readFileSync(join(lockDirectory, OWNER_FILE), "utf8")
    );

    if (raw && typeof raw === "object" && "pid" in raw) {
      const { pid, startedAt } = raw as {
        pid: unknown;
        startedAt?: unknown;
      };

      if (typeof pid === "number") {
        return {
          pid,
          startedAt: typeof startedAt === "number" ? startedAt : 0,
        };
      }
    }
  } catch {
    // An owner file that is missing or unreadable means the holder died
    // between `mkdir` and its first write, so the lock counts as stale.
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * `mkdir` is the atomic primitive here: on every POSIX filesystem exactly one
 * caller creates the directory and everyone else gets `EEXIST`. A lock file
 * written with `writeFile` would let two sessions past at once and hand the
 * same slot or device to both.
 */
async function acquire(
  lockDirectory: string,
  options: Required<LockOptions>
): Promise<void> {
  const deadline = Date.now() + options.timeoutMs;

  // The parent is created up front so the loop below only ever creates the
  // lock itself, which is what has to stay a single atomic step.
  mkdirSync(dirname(lockDirectory), { recursive: true });

  for (;;) {
    try {
      mkdirSync(lockDirectory, { recursive: false });
      writeFileSync(
        join(lockDirectory, OWNER_FILE),
        JSON.stringify({ pid: process.pid, startedAt: Date.now() })
      );

      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }

    const owner = readOwner(lockDirectory);

    if (!(owner && options.isProcessAlive(owner.pid))) {
      // The holder is gone. Releasing on its behalf is safe because the only
      // thing the lock protects is the state file, which is replaced whole.
      rmSync(lockDirectory, { force: true, recursive: true });
      continue;
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `개발 세션 잠금을 기다리다 시간이 지났습니다: ${lockDirectory} (실행 중인 프로세스 ${owner.pid}). 그 명령이 끝난 뒤 다시 실행해 주세요.`
      );
    }

    // biome-ignore lint/performance/noAwaitInLoops: waiting for another session to release the lock is exactly a sequential retry.
    await sleep(RETRY_INTERVAL_MS);
  }
}

export async function withLock<T>(
  lockDirectory: string,
  run: () => Promise<T> | T,
  options: LockOptions = {}
): Promise<T> {
  const resolved: Required<LockOptions> = {
    isProcessAlive: options.isProcessAlive ?? defaultIsProcessAlive,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };

  await acquire(lockDirectory, resolved);

  try {
    return await run();
  } finally {
    rmSync(lockDirectory, { force: true, recursive: true });
  }
}

export { defaultIsProcessAlive };
