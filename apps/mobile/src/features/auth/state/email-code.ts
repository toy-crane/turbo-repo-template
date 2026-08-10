import {
  OTP_EXPIRY_MINUTES,
  OTP_LENGTH,
} from "@/features/auth/config/email-otp";

/**
 * What the sign-in form does with the address and the code before either one
 * reaches the server, and how it describes both back to the person.
 */

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
