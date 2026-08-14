import type { Database } from "@repo/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type AccountDeletionClient = Pick<SupabaseClient<Database>, "functions">;

/** Permanently deletes the account that owns the client's current session. */
export async function deleteAccount(
  client: AccountDeletionClient
): Promise<void> {
  const { data, error } = await client.functions.invoke("delete-account");

  if (error) {
    throw error;
  }

  if ((data as { deleted?: unknown } | null)?.deleted !== true) {
    throw new Error("The account deletion response was incomplete.");
  }
}
