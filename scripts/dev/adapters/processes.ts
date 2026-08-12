import { spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, sep } from "node:path";

import { run } from "./command";

const STOP_GRACE_MS = 2000;
const STOP_POLL_MS = 50;

export interface SpawnSessionInput {
  argv: string[];
  cwd: string;
  env: Record<string, string>;
  logPath: string;
}

/**
 * Detaching puts the child in its own process group, which is what makes both
 * halves of the contract work: the session survives the terminal that started
 * it, and stopping it later reaches the whole tree — `expo start` spawns Metro
 * workers that a bare `kill <pid>` would leave behind holding the port.
 */
export function spawnSession({
  argv,
  cwd,
  env,
  logPath,
}: SpawnSessionInput): number {
  mkdirSync(dirname(logPath), { recursive: true });

  const log = openSync(logPath, "a");

  try {
    const [command, ...args] = argv;

    if (!command) {
      throw new Error("실행할 명령이 비어 있습니다.");
    }

    const child = spawn(command, args, {
      cwd,
      detached: true,
      env,
      stdio: ["ignore", log, log],
    });

    child.unref();

    if (!child.pid) {
      throw new Error(`프로세스를 시작하지 못했습니다: ${argv.join(" ")}`);
    }

    return child.pid;
  } finally {
    closeSync(log);
  }
}

export function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 1) {
    return false;
  }

  try {
    process.kill(pid, 0);

    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function processCommand(pid: number): Promise<string> {
  const { code, stdout } = await run([
    "/bin/ps",
    "-p",
    String(pid),
    "-o",
    "command=",
  ]);

  return code === 0 ? stdout.trim() : "";
}

async function processWorkingDirectory(pid: number): Promise<string> {
  const { code, stdout } = await run([
    "/usr/sbin/lsof",
    "-a",
    "-d",
    "cwd",
    "-p",
    String(pid),
    "-Fn",
  ]);

  if (code !== 0) {
    return "";
  }

  const line = stdout
    .split("\n")
    .find((entry) => entry.startsWith("n") && entry.length > 1);

  return line ? line.slice(1).trim() : "";
}

/**
 * A recorded pid is only ours when the process still runs *and* still belongs
 * to this worktree. Pids get reused, so without this a stop command could kill
 * whatever unrelated program inherited the number.
 */
export async function isOwnedByWorktree(
  pid: number,
  worktreePath: string
): Promise<boolean> {
  if (!isProcessAlive(pid)) {
    return false;
  }

  const [command, workingDirectory] = await Promise.all([
    processCommand(pid),
    processWorkingDirectory(pid),
  ]);

  // The argv path always continues past the worktree root, so the separator
  // keeps `/worktrees/feature` from matching `/worktrees/feature-2/...`.
  return (
    isInside(workingDirectory, worktreePath) ||
    command.includes(`${worktreePath}${sep}`)
  );
}

/**
 * Compared as paths, not as text. `/worktrees/feature` is not a parent of
 * `/worktrees/feature-2`, and a plain `startsWith` would say it is — which
 * would let one worktree's stop command kill another worktree's session.
 */
export function isInside(path: string, parent: string): boolean {
  return path === parent || path.startsWith(`${parent}${sep}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function signalGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // Already gone, which is the outcome the caller wanted.
    }
  }
}

/** Asks the process group to stop, then insists once the grace period is over. */
export async function stopProcess(pid: number): Promise<void> {
  if (!isProcessAlive(pid)) {
    return;
  }

  signalGroup(pid, "SIGTERM");

  const deadline = Date.now() + STOP_GRACE_MS;

  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) {
      return;
    }

    // biome-ignore lint/performance/noAwaitInLoops: polling a shutdown is sequential by nature.
    await sleep(STOP_POLL_MS);
  }

  signalGroup(pid, "SIGKILL");
}

/**
 * Binding is the honest test: it answers the same question the API and Metro
 * ask a moment later, including a port held on another local address.
 */
export function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", () => {
      resolve(false);
    });
    server.listen({ host: "0.0.0.0", port }, () => {
      server.close(() => {
        resolve(true);
      });
    });
  });
}
