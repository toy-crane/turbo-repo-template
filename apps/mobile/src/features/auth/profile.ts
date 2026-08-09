import type { Database } from "@repo/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProviderIdentity } from "./provider-sign-in";

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
