import { bytesToHex } from "@noble/ciphers/utils.js";
import {
  CryptoDigestAlgorithm,
  CryptoEncoding,
  digestStringAsync,
  getRandomBytes,
} from "expo-crypto";

const NONCE_BYTES = 32;

export interface SignInNonce {
  /** SHA-256 hex of `raw`. This is what the provider puts in the ID token. */
  hashed: string;
  /** The value Supabase hashes and compares against the token's nonce claim. */
  raw: string;
}

/**
 * The nonce ties one sign-in attempt to one ID token.
 *
 * Neither Google nor Apple hashes anything: each echoes the string it was given
 * into the token's `nonce` claim. So the app sends the hash to the provider and
 * the original to Supabase, which hashes it again and compares. An ID token
 * captured from an earlier attempt carries an older hash and fails that
 * comparison, which is the whole point — do not turn the check off to make a
 * mismatch go away.
 *
 * Hex, not base64: it is what Supabase compares against.
 */
export function createRawNonce(): string {
  return bytesToHex(getRandomBytes(NONCE_BYTES));
}

export function hashNonce(raw: string): Promise<string> {
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, raw, {
    encoding: CryptoEncoding.HEX,
  });
}

/** Call once per sign-in attempt. Reusing a pair defeats the check. */
export async function createSignInNonce(): Promise<SignInNonce> {
  const raw = createRawNonce();

  return { hashed: await hashNonce(raw), raw };
}
