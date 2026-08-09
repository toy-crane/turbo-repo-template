import type { Database } from "@repo/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Email one-time codes. Sign-in and sign-up are the same flow: an address that
 * has no user yet gets one, which is why `shouldCreateUser` stays on.
 *
 * The three constants below describe server settings the app cannot read at
 * runtime, so they are duplicated here and have to be changed together with
 * `supabase/config.toml` (and with the Dashboard for a remote project).
 */

/** `[auth.email] otp_length`. */
export const OTP_LENGTH = 6;
/** `[auth.email] max_frequency`, in seconds. */
export const RESEND_COOLDOWN_SECONDS = 60;
/** `[auth.email] otp_expiry`, in minutes. */
export const OTP_EXPIRY_MINUTES = 60;

const DIGITS_ONLY = /\D/g;
// Deliberately loose. The server decides what it accepts; this only catches the
// obvious typo before the app spends a round trip and a send-rate allowance.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return EMAIL_SHAPE.test(normalizeEmail(value));
}

/** Keeps a pasted code usable when it arrives with spaces or dashes around it. */
export function toCodeDigits(value: string): string {
  return value.replace(DIGITS_ONLY, "").slice(0, OTP_LENGTH);
}

export function isCompleteCode(value: string): boolean {
  return toCodeDigits(value).length === OTP_LENGTH;
}

export function formatResendLabel(secondsLeft: number): string {
  return secondsLeft > 0
    ? `${secondsLeft}초 뒤에 코드 다시 받기`
    : "코드 다시 받기";
}

export function describeCodeSent(email: string): string {
  return `${email}으로 ${OTP_LENGTH}자리 코드를 보냈습니다. 코드는 ${OTP_EXPIRY_MINUTES}분 동안 쓸 수 있습니다.`;
}

export async function sendEmailCode(
  client: SupabaseClient<Database>,
  email: string
): Promise<void> {
  const { error } = await client.auth.signInWithOtp({
    email,
    // No `emailRedirectTo`: this app has no browser callback and no auth deep
    // link. The template's email sends a code, never a link.
    options: { shouldCreateUser: true },
  });

  if (error) {
    throw error;
  }
}

export async function verifyEmailCode(
  client: SupabaseClient<Database>,
  email: string,
  code: string
): Promise<void> {
  const { error } = await client.auth.verifyOtp({
    email,
    token: toCodeDigits(code),
    type: "email",
  });

  if (error) {
    throw error;
  }
}
