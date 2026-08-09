import type { Database } from "@repo/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

import { fillEmptyProfileValues } from "./profile";

/** What a provider knows about the person, offered as profile candidates only. */
export interface ProviderIdentity {
  avatarUrl: string | null;
  displayName: string | null;
}

export interface ProviderSignInResult {
  identity: ProviderIdentity;
  idToken: string;
  /** The unhashed nonce for this attempt. The provider got its SHA-256. */
  rawNonce: string;
}

/**
 * Hands the provider's ID token to Supabase, which verifies the signature, the
 * audience and the nonce, and issues the app session.
 *
 * Supabase links identities that share an email it verified itself, so nothing
 * here compares email strings or merges accounts.
 */
export async function completeProviderSignIn(
  client: SupabaseClient<Database>,
  provider: "apple" | "google",
  result: ProviderSignInResult
): Promise<void> {
  const { data, error } = await client.auth.signInWithIdToken({
    nonce: result.rawNonce,
    provider,
    token: result.idToken,
  });

  if (error) {
    throw error;
  }

  if (data.user) {
    await fillEmptyProfileValues(client, data.user.id, result.identity);
  }
}
