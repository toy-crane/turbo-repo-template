import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { argv, env, exit, stderr, stdout } from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

/**
 * Reads the one-time code that local Supabase just mailed to Mailpit, so a
 * person or an agent can type it into the app's sign-in screen.
 *
 * It reads mail and nothing else. It does not request the code, does not call
 * `verifyOtp`, and never creates or injects a session — the app has to do that
 * through the same screens a real user touches, otherwise a passing run says
 * nothing about whether sign-in works.
 */

// Mailpit's default web interface: `[local_smtp] port` in supabase/config.toml.
// Deliberately not configurable. A code read from some other mail host would
// not be the code the local stack issued.
export const MAILPIT_URL = "http://127.0.0.1:54324";

const SUPABASE_URL_ENV = "EXPO_PUBLIC_SUPABASE_URL";
const MOBILE_ENV_FILE = "apps/mobile/.env.local";
const DEFAULT_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1000;
// Mail that landed just before this command started still counts: the usual
// order is to tap 계속 in the app first, then run this.
const ARRIVAL_GRACE_MS = 120_000;
const OTP_PATTERN = /(?<!\d)\d{6}(?!\d)/g;
const SURROUNDING_QUOTES = /^["']|["']$/g;
const IPV6_BRACKETS = /^\[|\]$/g;
const HTML_TAG = /<[^>]*>/g;

// Which hosts count as "the local stack". 10.0.2.2 is in the set because an
// Android emulator reaches the host's loopback through that alias: the app is
// configured with it while Mailpit still answers on 127.0.0.1 here. Anything
// else is either a remote project or a host this command cannot vouch for, and
// in both cases the code it would print is not the code the app is waiting for.
const LOCAL_SUPABASE_HOSTS = new Set([
  "10.0.2.2",
  "127.0.0.1",
  "::1",
  "localhost",
]);

const USAGE = `사용법: bun run auth:otp -- --email <주소> [--timeout <초>]

로컬 Supabase가 Mailpit으로 보낸 6자리 로그인 코드를 읽어 출력합니다.
코드를 요청하지도, 확인하지도 않습니다. 앱에서 코드를 요청한 뒤 실행하세요.

실행할 때마다 다른 이메일 주소를 사용하세요. 같은 주소를 다시 쓰면 이전 코드와
새 코드를 구분하기 어렵습니다.`;

export interface OtpOptions {
  email: string;
  timeoutMs: number;
}

export interface MailpitSummary {
  arrivedAt: Date;
  id: string;
  recipients: string[];
}

export interface OtpReadResult {
  arrivedAt: Date;
  code: string;
}

export function parseOtpArgs(args: string[]): OtpOptions {
  let email: string | undefined;
  let timeoutMs = DEFAULT_TIMEOUT_MS;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index] ?? "";
    const separator = argument.indexOf("=");
    const [flag, inlineValue] =
      separator === -1
        ? [argument, undefined]
        : [argument.slice(0, separator), argument.slice(separator + 1)];
    const value = inlineValue ?? args[index + 1];

    if (flag !== "--email" && flag !== "--timeout") {
      throw new Error(
        `알 수 없는 옵션입니다: ${argument}. 사용 가능한 옵션: --email, --timeout.`
      );
    }

    // Reject any `-` prefix, not only `--`: a following flag would otherwise be
    // swallowed as this option's value.
    if (!value || value.startsWith("-")) {
      throw new Error(`${flag} 옵션에는 값이 필요합니다.`);
    }

    if (inlineValue === undefined) {
      index += 1;
    }

    if (flag === "--email") {
      email = value.trim();
      continue;
    }

    const seconds = Number(value);

    if (!Number.isFinite(seconds) || seconds <= 0) {
      throw new Error(`--timeout 옵션에는 양수 초를 넘겨야 합니다: ${value}.`);
    }

    timeoutMs = Math.round(seconds * 1000);
  }

  if (!email) {
    throw new Error(`--email 옵션이 필요합니다.\n\n${USAGE}`);
  }

  if (!email.includes("@")) {
    throw new Error(`이메일 주소 형식이 아닙니다: ${email}.`);
  }

  return { email, timeoutMs };
}

export function readEnvValue(
  contents: string,
  name: string
): string | undefined {
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    const separator = trimmed.indexOf("=");

    if (!trimmed || trimmed.startsWith("#") || separator === -1) {
      continue;
    }

    if (trimmed.slice(0, separator).trim() !== name) {
      continue;
    }

    return trimmed
      .slice(separator + 1)
      .trim()
      .replace(SURROUNDING_QUOTES, "");
  }
}

export function assertLocalSupabaseUrl(rawUrl: string | undefined): URL {
  if (!rawUrl) {
    throw new Error(
      `${SUPABASE_URL_ENV}을 찾을 수 없습니다. ${MOBILE_ENV_FILE}에 로컬 Supabase URL을 설정하세요. README.md "Supabase 연결"을 참고하세요.`
    );
  }

  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch (error) {
    throw new Error(`${SUPABASE_URL_ENV} 값이 URL이 아닙니다: ${rawUrl}.`, {
      cause: error,
    });
  }

  if (!LOCAL_SUPABASE_HOSTS.has(url.hostname.replace(IPV6_BRACKETS, ""))) {
    throw new Error(
      `이 명령은 로컬 Supabase에서만 동작합니다. 지금 앱은 ${url.origin}을 가리키고 있어 로그인 코드가 Mailpit이 아니라 실제 받은 편지함으로 갑니다. 원격 프로젝트의 코드는 그 편지함에서 직접 확인하세요.`
    );
  }

  return url;
}

export function selectFreshMessage(
  messages: MailpitSummary[],
  recipient: string,
  notBefore: Date
): MailpitSummary | undefined {
  const wanted = recipient.toLowerCase();

  return messages
    .filter(
      (message) =>
        message.arrivedAt.getTime() >= notBefore.getTime() &&
        message.recipients.some((address) => address.toLowerCase() === wanted)
    )
    .sort((left, right) => right.arrivedAt.getTime() - left.arrivedAt.getTime())
    .at(0);
}

export function extractOtpCode(body: {
  html?: string | undefined;
  text?: string | undefined;
}): string {
  const source = body.text?.trim()
    ? body.text
    : (body.html ?? "").replace(HTML_TAG, " ");
  const codes = [...new Set(source.match(OTP_PATTERN) ?? [])];

  if (codes.length === 0) {
    throw new Error(
      "메일에서 6자리 코드를 찾지 못했습니다. Supabase 이메일 템플릿에 {{ .Token }}이 있는지 확인하세요."
    );
  }

  // More than one candidate means the template changed and this command can no
  // longer tell the code from some other number. Guessing would hand back a
  // wrong code that looks right.
  if (codes.length > 1) {
    throw new Error(
      `메일에서 6자리 숫자를 여러 개 찾았습니다 (${codes.join(", ")}). 어느 것이 코드인지 확신할 수 없어 중단합니다.`
    );
  }

  return codes[0] as string;
}

async function fetchMailpitJson(path: string): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(`${MAILPIT_URL}${path}`);
  } catch (error) {
    throw new Error(
      `Mailpit(${MAILPIT_URL})에 연결하지 못했습니다. bun run db:start으로 로컬 스택을 먼저 켜세요.`,
      { cause: error }
    );
  }

  if (!response.ok) {
    throw new Error(
      `Mailpit 요청이 실패했습니다: ${response.status} ${response.statusText}.`
    );
  }

  return response.json();
}

function toSummaries(payload: unknown): MailpitSummary[] {
  const { messages } = payload as { messages?: unknown };

  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.flatMap((raw) => {
    const message = raw as {
      Created?: unknown;
      ID?: unknown;
      To?: { Address?: unknown }[] | null;
    };
    const arrivedAt = new Date(String(message.Created ?? ""));

    if (typeof message.ID !== "string" || Number.isNaN(arrivedAt.getTime())) {
      return [];
    }

    return [
      {
        arrivedAt,
        id: message.ID,
        recipients: (message.To ?? []).flatMap((address) =>
          typeof address?.Address === "string" ? [address.Address] : []
        ),
      },
    ];
  });
}

async function readMessageBody(id: string): Promise<{
  html?: string | undefined;
  text?: string | undefined;
}> {
  const payload = (await fetchMailpitJson(`/api/v1/message/${id}`)) as {
    HTML?: unknown;
    Text?: unknown;
  };

  return {
    html: typeof payload.HTML === "string" ? payload.HTML : undefined,
    text: typeof payload.Text === "string" ? payload.Text : undefined,
  };
}

/**
 * A missing or unreadable env file is not an error here. The caller turns the
 * absent URL into the message that says which file to fill in.
 */
async function readOptionalFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    // Absent or unreadable both mean "not configured here".
  }
}

/**
 * Polls Mailpit until the code for this recipient shows up. Exported so the
 * local integration tests can reach the same mailbox the CLI reads, rather than
 * growing a second copy of this logic that could drift.
 */
export async function waitForOtp(options: OtpOptions): Promise<OtpReadResult> {
  const startedAt = Date.now();
  const notBefore = new Date(startedAt - ARRIVAL_GRACE_MS);
  const query = encodeURIComponent(`to:${options.email}`);

  while (Date.now() - startedAt < options.timeoutMs) {
    // biome-ignore-start lint/performance/noAwaitInLoops: mail arrives some time after the app asks for it, so each pass has to finish before the next one can tell whether it is there yet.
    const summaries = toSummaries(
      await fetchMailpitJson(`/api/v1/search?query=${query}&limit=20`)
    );
    const message = selectFreshMessage(summaries, options.email, notBefore);

    if (message) {
      return {
        arrivedAt: message.arrivedAt,
        code: extractOtpCode(await readMessageBody(message.id)),
      };
    }

    await sleep(POLL_INTERVAL_MS);
    // biome-ignore-end lint/performance/noAwaitInLoops: end of the polling loop.
  }

  throw new Error(
    `${Math.round(options.timeoutMs / 1000)}초 안에 ${options.email}으로 온 코드 메일이 없습니다. 앱에서 코드를 먼저 요청했는지, Supabase 전송 한도에 걸리지 않았는지 확인하세요.`
  );
}

async function main() {
  const options = parseOtpArgs(argv.slice(2));
  const repositoryRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    ".."
  );
  const envFile = await readOptionalFile(
    resolve(repositoryRoot, MOBILE_ENV_FILE)
  );

  assertLocalSupabaseUrl(
    env[SUPABASE_URL_ENV] ??
      (envFile ? readEnvValue(envFile, SUPABASE_URL_ENV) : undefined)
  );

  const { arrivedAt, code } = await waitForOtp(options);

  // Context goes to stderr so that stdout carries the code and nothing else.
  stderr.write(
    `${options.email}으로 ${arrivedAt.toLocaleTimeString()}에 도착한 코드입니다.\n`
  );
  stdout.write(`${code}\n`);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    exit(1);
  });
}
