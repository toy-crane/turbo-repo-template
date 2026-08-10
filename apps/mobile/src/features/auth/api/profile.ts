import type { Database } from "@repo/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProviderIdentity } from "./provider-sign-in";

/** The profile values a screen shows. The row itself holds more. */
export interface UserProfile {
  avatarUrl: string | null;
  displayName: string | null;
}

/**
 * Reads the signed-in person's own profile.
 *
 * No user id filter beyond `eq("id", userId)` is needed for safety: the
 * `profiles_select_own` policy already limits the rows this key can read. The
 * filter is what makes the read a single row rather than a scan.
 */
export async function readProfile(
  client: SupabaseClient<Database>,
  userId: string
): Promise<UserProfile> {
  const { data, error } = await client
    .from("profiles")
    .select("avatar_url, display_name")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return { avatarUrl: data.avatar_url, displayName: data.display_name };
}

/**
 * Offers the provider's name and picture as starting values for a profile that
 * has none.
 *
 * `.is(column, null)` is what makes "only fill what is empty" true rather than
 * intended: the database decides, in the same statement, whether the column is
 * still empty. A read-then-write could pass its check and then overwrite a name
 * the user saved from another device a moment earlier.
 *
 * A failure here is not a sign-in failure. The person is signed in; the profile
 * simply stays empty and stays editable.
 */
export async function fillEmptyProfileValues(
  client: SupabaseClient<Database>,
  userId: string,
  identity: ProviderIdentity
): Promise<void> {
  if (identity.displayName) {
    await client
      .from("profiles")
      .update({ display_name: identity.displayName })
      .eq("id", userId)
      .is("display_name", null);
  }

  if (identity.avatarUrl) {
    await client
      .from("profiles")
      .update({ avatar_url: identity.avatarUrl })
      .eq("id", userId)
      .is("avatar_url", null);
  }
}
