import type { Database } from "@repo/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

import { signOutOfGoogle } from "./google-sign-in";

/**
 * Ends the session on this device only.
 *
 * `scope: "local"` leaves other devices signed in: leaving on a phone should
 * not cut off work in progress on a tablet. Apple gets no provider sign-out at
 * all, and Google gets a local one so its account picker comes back next time.
 * Withdrawing provider consent and signing out everywhere are separate features.
 *
 * The provider step runs even when Supabase failed, so a dead local session
 * cannot leave Google signed in behind it. Emptying the query cache belongs to
 * the sign-out state, which runs it whatever this call did.
 */
export async function signOut(client: SupabaseClient<Database>): Promise<void> {
  let failure: unknown;

  try {
    const { error } = await client.auth.signOut({ scope: "local" });

    if (error) {
      failure = error;
    }
  } catch (error) {
    failure = error;
  }

  try {
    await signOutOfGoogle();
  } catch {
    // Google's SDK raises when configure() never ran, which is the normal state
    // for a project that only uses email. Nothing to recover from.
  }

  if (failure) {
    throw failure;
  }
}
