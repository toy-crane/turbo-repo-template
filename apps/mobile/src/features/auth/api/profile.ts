import type { Database } from "@repo/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProviderIdentity } from "./provider-sign-in";

/** The profile values a screen shows. The row itself holds more. */
export interface UserProfile {
  /** The object in the avatars bucket, when the person chose their own picture. */
  avatarPath: string | null;
  /** What the sign-in provider offered, used while there is no chosen picture. */
  avatarUrl: string | null;
  displayName: string | null;
  username: string | null;
  /**
   * When the account id may change again, as an ISO string, or null while it is
   * free to change. The server decides the instant; the screen only reads it.
   */
  usernameLockedUntil: string | null;
}

/** The two values a person chooses during onboarding. */
export interface ProfileIdentity {
  displayName: string;
  username: string;
}

/**
 * Everything the edit screen can change, as one change.
 *
 * `avatarPath` carries three cases rather than two: a string is a new picture,
 * `null` is deleting the current one, and leaving the field out is not touching
 * the picture at all. Without the third, saving a new nickname would clear a
 * picture the person never opened the photo menu for.
 */
export interface ProfileEdit {
  avatarPath?: string | null;
  displayName: string;
  username: string;
}

/** What the database says about an account id someone is considering. */
export type UsernameStatus = "available" | "invalid" | "reserved" | "taken";

const PROFILE_COLUMNS =
  "avatar_path, avatar_url, display_name, username, username_locked_until";
/** PostgreSQL's unique violation, which is how a taken account id arrives. */
const UNIQUE_VIOLATION = "23505";
/** PostgreSQL's check violation, which is how the 30 day lock arrives. */
const CHECK_VIOLATION = "23514";

function toUserProfile(row: {
  avatar_path: string | null;
  avatar_url: string | null;
  display_name: string | null;
  username: string | null;
  username_locked_until: string | null;
}): UserProfile {
  return {
    avatarPath: row.avatar_path,
    avatarUrl: row.avatar_url,
    displayName: row.display_name,
    username: row.username,
    usernameLockedUntil: row.username_locked_until,
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
 * Saves the picture, the nickname and the account id as one change.
 *
 * One statement for the same reason onboarding uses one: if the id turns out to
 * be taken, or the 30 day lock has not run out, the whole update is rejected and
 * the nickname does not land on its own.
 *
 * `avatar_chosen_by_user` is written whenever the picture is part of the change,
 * including when it is being deleted. That is what stops the next provider
 * sign-in from putting its picture back into a profile the person just cleared.
 */
export async function saveProfileEdit(
  client: SupabaseClient<Database>,
  userId: string,
  edit: ProfileEdit
): Promise<UserProfile> {
  const changes: {
    avatar_chosen_by_user?: boolean;
    avatar_path?: string | null;
    avatar_url?: string | null;
    display_name: string;
    username: string;
  } = {
    display_name: edit.displayName,
    username: edit.username,
  };

  if (edit.avatarPath !== undefined) {
    changes.avatar_chosen_by_user = true;
    changes.avatar_path = edit.avatarPath;
    // The provider's picture goes with it. Leaving it behind would show it again
    // the moment the chosen one is deleted, which is the opposite of deleting.
    changes.avatar_url = null;
  }

  const { data, error } = await client
    .from("profiles")
    .update(changes)
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return toUserProfile(data);
}

function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

/**
 * True when a save lost the race for an account id.
 *
 * The screen recovers from this one by offering other spellings, so it has to
 * be told apart from a network failure, which recovers by trying again. An id
 * another account released recently arrives the same way, on purpose: to the
 * person asking, both mean pick another.
 */
export function isUsernameTaken(error: unknown): boolean {
  return hasErrorCode(error, UNIQUE_VIOLATION);
}

/**
 * True when a save was refused because the account id is still locked.
 *
 * The screen disables the field while the lock is on, so reaching this means the
 * screen's copy of the lock was out of date — the person has this profile open
 * on another device, or left the screen sitting long enough for it to change.
 */
export function isUsernameLocked(error: unknown): boolean {
  return hasErrorCode(error, CHECK_VIOLATION);
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
    // `avatar_chosen_by_user` is the second half of "only fill what is empty".
    // A person who deleted their picture has an empty `avatar_url` and does not
    // want it filled, and the two conditions are what tell that apart from a
    // profile that has simply never had one.
    await client
      .from("profiles")
      .update({ avatar_url: identity.avatarUrl })
      .eq("id", userId)
      .eq("avatar_chosen_by_user", false)
      .is("avatar_url", null);
  }
}
