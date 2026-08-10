import {
  type AppleAuthenticationFullName,
  AppleAuthenticationScope,
  signInAsync,
} from "expo-apple-authentication";

import { MissingProviderTokenError } from "./auth-errors";
import { createSignInNonce } from "./nonce";
import type { ProviderSignInResult } from "./provider-sign-in";

const CANCELLED_CODE = "ERR_REQUEST_CANCELED";

function isCancellation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === CANCELLED_CODE
  );
}

/**
 * Apple sends the name in parts and only on the very first approval for this
 * App ID. Later sign-ins return null, so whatever arrives here is used right
 * away rather than kept for later.
 */
export function toAppleDisplayName(
  fullName: AppleAuthenticationFullName | null
): string | null {
  const name = [fullName?.givenName, fullName?.familyName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || null;
}

/**
 * Runs Apple's sheet and returns what Supabase needs. Returns undefined when
 * the person closed it, which is not a failure.
 *
 * A missing name never fails the sign-in: Apple withholds it on every sign-in
 * after the first, and the profile is editable anyway.
 */
export async function signInWithApple(): Promise<
  ProviderSignInResult | undefined
> {
  const nonce = await createSignInNonce();

  try {
    const credential = await signInAsync({
      // Apple copies this into the token's nonce claim without hashing it, so
      // the hash goes here and the original goes to Supabase.
      nonce: nonce.hashed,
      requestedScopes: [
        AppleAuthenticationScope.FULL_NAME,
        AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new MissingProviderTokenError();
    }

    return {
      identity: {
        avatarUrl: null,
        displayName: toAppleDisplayName(credential.fullName),
      },
      idToken: credential.identityToken,
      rawNonce: nonce.raw,
    };
  } catch (error) {
    if (isCancellation(error)) {
      return;
    }

    throw error;
  }
}
