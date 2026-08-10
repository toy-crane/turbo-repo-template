import type { Database } from "@repo/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProviderIdentity } from "./provider-sign-in";

/** The profile values a screen shows. The row itself holds more. */
export interface UserProfile {
  avatarUrl: string | null;
  displayName: string | null;
  username: string | null;
}

/** The two values a person chooses during onboarding. */
export interface ProfileIdentity {
  displayName: string;
  username: string;
}

/** What the database says about an account id someone is considering. */
export type UsernameStatus = "available" | "invalid" | "reserved" | "taken";

const PROFILE_COLUMNS = "avatar_url, display_name, username";
/** PostgreSQL's unique violation, which is how a taken account id arrives. */
const UNIQUE_VIOLATION = "23505";

function toUserProfile(row: {
  avatar_url: string | null;
  display_name: string | null;
  username: string | null;
}): UserProfile {
  return {
    avatarUrl: row.avatar_url,
    displayName: row.display_name,
    username: row.username,
  };
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
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return toUserProfile(data);
}

/**
 * Both values are chosen, so the profile is finished and the app opens.
 *
 * There is no separate "onboarding done" column on purpose: a flag can say
 * finished while the values it stands for are empty, and then two things have
 * to be kept true instead of one.
 */
export function isProfileComplete(profile: UserProfile | undefined): boolean {
  return Boolean(profile?.displayName && profile.username);
}

/**
 * Asks whether an account id can be taken.
 *
 * This is a database function rather than a select because a client may only
 * read its own profile row. It answers with one word about the id that was
 * asked for and never with anyone's values.
 */
export async function readUsernameStatus(
  client: SupabaseClient<Database>,
  candidate: string
): Promise<UsernameStatus> {
  const { data, error } = await client.rpc("username_status", { candidate });

  if (error) {
    throw error;
  }

  return data as UsernameStatus;
}

/** Narrows a list of spellings down to the ones nobody holds. */
export async function readAvailableUsernames(
  client: SupabaseClient<Database>,
  candidates: string[]
): Promise<string[]> {
  const { data, error } = await client.rpc("available_usernames", {
    candidates,
  });

  if (error) {
    throw error;
  }

  return data ?? [];
}

/**
 * Saves the nickname and the account id as one change.
 *
 * One statement is what makes the pair all-or-nothing. If the id was taken in
 * the moment between the availability check and this call, the unique
 * constraint rejects the whole update and the nickname does not land on its
 * own — which would leave a profile that is half finished and a screen that
 * cannot say so.
 *
 * The saved row comes back in the same round trip so the caller can put it
 * straight into the cache. Re-reading instead would leave a window where the
 * app still believes the profile is unfinished.
 */
export async function saveProfileIdentity(
  client: SupabaseClient<Database>,
  userId: string,
  identity: ProfileIdentity
): Promise<UserProfile> {
  const { data, error } = await client
    .from("profiles")
    .update({
      display_name: identity.displayName,
      username: identity.username,
    })
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return toUserProfile(data);
}

/**
 * True when a save lost the race for an account id.
 *
 * The screen recovers from this one by offering other spellings, so it has to
 * be told apart from a network failure, which recovers by trying again.
 */
export function isUsernameTaken(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
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
