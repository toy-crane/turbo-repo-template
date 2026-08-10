/**
 * Turns whatever a provider SDK or Supabase threw into one of a few outcomes the
 * sign-in screen knows how to show.
 *
 * The split that matters most is `cancelled`: a person who closed the Google or
 * Apple sheet did not hit a problem, and telling them something failed is both
 * wrong and alarming. Everything else has to stay distinguishable enough that a
 * user can tell "try again" from "this app is not set up".
 */

export type AuthFailureKind =
  | "cancelled"
  | "invalidCode"
  | "invalidEmail"
  | "missingToken"
  | "network"
  | "noProviderCredential"
  | "rateLimited"
  | "unknown";

export interface AuthFailure {
  kind: AuthFailureKind;
  /** Empty for `cancelled`, which the screen shows nothing for. */
  message: string;
}

/** The provider reported success but handed back no ID token. */
export class MissingProviderTokenError extends Error {}

/**
 * The provider's SDK finished without a credential and without a cancellation.
 *
 * Named for what the SDK reported rather than for a cause, because the app
 * cannot tell why: the usual reason is that the device has no account for that
 * provider, but the SDK does not say so.
 */
export class NoProviderCredentialError extends Error {}

const CANCELLED_CODES = new Set([
  // expo-apple-authentication
  "ERR_REQUEST_CANCELED",
  // react-native-nitro-google-signin
  "SIGN_IN_CANCELLED",
]);
const RATE_LIMIT_CODES = new Set([
  "over_email_send_rate_limit",
  "over_request_rate_limit",
  "over_sms_send_rate_limit",
]);
const INVALID_EMAIL_CODES = new Set([
  "email_address_invalid",
  "validation_failed",
]);
const NETWORK_MESSAGE = /network request failed|failed to fetch/i;
const TOO_MANY_REQUESTS = 429;

function readStringField(error: unknown, field: string): string | undefined {
  if (typeof error !== "object" || error === null || !(field in error)) {
    return;
  }

  const value = (error as Record<string, unknown>)[field];

  return typeof value === "string" ? value : undefined;
}

function readStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return;
  }

  const { status } = error as { status?: unknown };

  return typeof status === "number" ? status : undefined;
}

function isNetworkError(error: unknown): boolean {
  // Supabase wraps a failed fetch in AuthRetryableFetchError; React Native's own
  // fetch rejects with a TypeError whose message names the failure.
  return (
    readStringField(error, "name") === "AuthRetryableFetchError" ||
    error instanceof TypeError ||
    NETWORK_MESSAGE.test(readStringField(error, "message") ?? "")
  );
}

/**
 * True only for the limit that means "a code went out to this address very
 * recently", which is the one case where the person already holds a usable
 * code and should be sent on to type it.
 *
 * Deliberately narrower than the `rateLimited` classification: that one also
 * covers the project-wide request limiter and any bare 429, neither of which
 * tells us a code was ever sent.
 */
export function isEmailSendRateLimit(error: unknown): boolean {
  return readStringField(error, "code") === "over_email_send_rate_limit";
}

export function classifyAuthError(error: unknown): AuthFailure {
  if (CANCELLED_CODES.has(readStringField(error, "code") ?? "")) {
    return { kind: "cancelled", message: "" };
  }

  if (error instanceof NoProviderCredentialError) {
    return {
      kind: "noProviderCredential",
      message: "기기에 Google 계정이 있는지 확인한 뒤 다시 시도해 주세요.",
    };
  }

  if (error instanceof MissingProviderTokenError) {
    return {
      kind: "missingToken",
      message: "잠시 후 다시 시도해 주세요.",
    };
  }

  if (isNetworkError(error)) {
    return {
      kind: "network",
      message: "연결을 확인하고 다시 시도해 주세요.",
    };
  }

  const code = readStringField(error, "code") ?? "";

  if (RATE_LIMIT_CODES.has(code) || readStatus(error) === TOO_MANY_REQUESTS) {
    return {
      kind: "rateLimited",
      message: "잠시 후 다시 시도해 주세요.",
    };
  }

  // Supabase answers a wrong code and an expired code with the same error, so
  // the message has to cover both rather than guess which one happened.
  if (code === "otp_expired" || code === "otp_disabled") {
    return {
      kind: "invalidCode",
      message: "코드를 다시 입력해 주세요.",
    };
  }

  if (INVALID_EMAIL_CODES.has(code)) {
    return {
      kind: "invalidEmail",
      message: "이메일 주소를 다시 입력해 주세요.",
    };
  }

  const message = readStringField(error, "message");

  return {
    kind: "unknown",
    message: message
      ? `다시 시도해 주세요. (${message})`
      : "다시 시도해 주세요.",
  };
}
