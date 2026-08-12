import { closeSync, openSync, readSync, statSync } from "node:fs";

const POLL_INTERVAL_MS = 250;
const REQUEST_TIMEOUT_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export interface WaitForHttpInput {
  /** Called with the body; lets a caller insist on more than a 200. */
  accepts?: (body: string) => boolean;
  /** Runs between attempts; throwing here reports the real failure. */
  check?: () => void;
  timeoutMs: number;
  url: string;
}

export async function waitForHttp({
  accepts,
  check,
  timeoutMs,
  url,
}: WaitForHttpInput): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";

  while (Date.now() < deadline) {
    check?.();

    try {
      // biome-ignore lint/performance/noAwaitInLoops: each attempt has to finish before the next one starts.
      const response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.ok) {
        const body = await response.text();

        if (!accepts || accepts(body)) {
          return;
        }

        lastError = `예상과 다른 응답: ${body.slice(0, 120)}`;
      } else {
        lastError = `HTTP ${response.status}`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`${url}이(가) 시간 안에 응답하지 않았습니다. ${lastError}`);
}

export function fileSize(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

interface LogChunk {
  /** Bytes consumed, which is what the next read must start from. */
  bytes: number;
  text: string;
}

function readFrom(path: string, offset: number): LogChunk {
  const size = fileSize(path);

  if (size <= offset) {
    return { bytes: 0, text: "" };
  }

  const handle = openSync(path, "r");

  try {
    const buffer = Buffer.alloc(size - offset);
    const read = readSync(handle, buffer, 0, buffer.length, offset);

    // The offset advances by bytes read, never by the decoded length: a
    // multi-byte character split across this boundary decodes to a single
    // replacement character, and counting that instead would push every later
    // read into the middle of a character.
    return { bytes: read, text: buffer.subarray(0, read).toString("utf8") };
  } finally {
    closeSync(handle);
  }
}

export interface WaitForLogInput {
  check?: () => void;
  logPath: string;
  pattern: RegExp;
  /** Only content written after this offset counts. */
  since: number;
  timeoutMs: number;
}

/**
 * The device answers `openurl` immediately, so the only honest evidence that
 * the app actually came up is its own request reaching this worktree's Metro.
 */
export async function waitForLogMatch({
  check,
  logPath,
  pattern,
  since,
  timeoutMs,
}: WaitForLogInput): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  let offset = since;
  let seen = "";

  while (Date.now() < deadline) {
    check?.();

    const chunk = readFrom(logPath, offset);

    if (chunk.bytes > 0) {
      offset += chunk.bytes;
      seen += chunk.text;

      if (pattern.test(seen)) {
        return true;
      }
    }

    // biome-ignore lint/performance/noAwaitInLoops: tailing a log is sequential by nature.
    await sleep(POLL_INTERVAL_MS);
  }

  return false;
}
