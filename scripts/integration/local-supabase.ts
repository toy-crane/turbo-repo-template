import { execFile } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import type { Database } from "@repo/supabase";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { waitForOtp } from "../auth/read-local-email-otp";

/**
 * Test-only helper: signs in through the real local Supabase Auth, the real
 * mailbox and the real Data API.
 *
 * It exists so the integration tests exercise the path a person actually takes.
 * Creating users with the admin API or minting a JWT would be faster and would
 * prove nothing about signup, the profile trigger, or RLS as the `authenticated`
 * role sees it — and it would spread a server-only secret into test tooling.
 *
 * The session it returns lives in memory for the length of the test process.
 * Nothing here writes a token to stdout, to a file, or to a CLI result.
 */

const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);
const CODE_TIMEOUT_MS = 30_000;

const runCommand = promisify(execFile);

export interface LocalStack {
  apiUrl: string;
  publishableKey: string;
}

export interface SignedInUser {
  client: SupabaseClient<Database>;
  email: string;
  userId: string;
}

/**
 * Reads the running stack's own connection values rather than hardcoding them,
 * so a project that changed its ports still runs these tests.
 */
export async function readLocalStack(): Promise<LocalStack> {
  let output: string;

  try {
    ({ stdout: output } = await runCommand(
      "bunx",
      ["supabase", "status", "-o", "json"],
      { cwd: REPOSITORY_ROOT }
    ));
  } catch (error) {
    throw new Error(
      "로컬 Supabase 스택을 찾지 못했습니다. bun run db:start으로 먼저 켜세요.",
      { cause: error }
    );
  }

  // The CLI prints a status line before the JSON when some optional service is
  // stopped, so start reading at the first brace rather than at the first byte.
  const parsed = JSON.parse(output.slice(output.indexOf("{"))) as {
    API_URL?: string;
    PUBLISHABLE_KEY?: string;
  };

  if (!(parsed.API_URL && parsed.PUBLISHABLE_KEY)) {
    throw new Error(
      "supabase status가 API URL과 publishable key를 주지 않았습니다."
    );
  }

  return { apiUrl: parsed.API_URL, publishableKey: parsed.PUBLISHABLE_KEY };
}

export function createAnonClient(stack: LocalStack): SupabaseClient<Database> {
  return createClient<Database>(stack.apiUrl, stack.publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      // Each client keeps its own session in memory, so two users in one test
      // process do not overwrite each other.
      persistSession: false,
    },
  });
}

/** A fresh address every run, so an old code can never be mistaken for a new one. */
export function uniqueTestEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}@example.test`;
}

export async function signInWithEmailCode(
  stack: LocalStack,
  email: string
): Promise<SignedInUser> {
  const client = createAnonClient(stack);
  const { error: sendError } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (sendError) {
    throw sendError;
  }

  const { code } = await waitForOtp({ email, timeoutMs: CODE_TIMEOUT_MS });
  const { data, error } = await client.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });

  if (error || !data.user) {
    throw error ?? new Error(`${email} 로그인이 사용자를 만들지 못했습니다.`);
  }

  return { client, email, userId: data.user.id };
}
