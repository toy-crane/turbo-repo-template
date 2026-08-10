import type { Database } from "@repo/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Email one-time codes. Sign-in and sign-up are the same flow: an address that
 * has no user yet gets one, which is why `shouldCreateUser` stays on.
 *
 * Both calls take the address and the code as the sign-in state already
 * prepared them; trimming and digit filtering belong to the form, not here.
 */

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
    token: code,
    type: "email",
  });

  if (error) {
    throw error;
  }
}
