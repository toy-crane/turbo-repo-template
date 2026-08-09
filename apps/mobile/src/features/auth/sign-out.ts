import type { Database } from "@repo/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueryClient } from "@tanstack/react-query";

import { signOutOfGoogle } from "./google-sign-in";

/**
 * Ends the session on this device only.
 *
 * `scope: "local"` leaves other devices signed in: leaving on a phone should
 * not cut off work in progress on a tablet. Apple gets no provider sign-out at
 * all, and Google gets a local one so its account picker comes back next time.
 * Withdrawing provider consent and signing out everywhere are separate features.
 *
 * Every step after the Supabase call runs even if an earlier one failed. The
 * cache in particular has to be emptied no matter what, or the next person to
 * sign in on this device reads the previous user's data out of it.
 */
export async function signOut(
  client: SupabaseClient<Database>,
  queryClient: QueryClient
): Promise<void> {
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

  queryClient.clear();

  if (failure) {
    throw failure;
  }
}
