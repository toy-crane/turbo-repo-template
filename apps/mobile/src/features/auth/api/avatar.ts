import { bytesToHex } from "@noble/ciphers/utils.js";
import type { Database } from "@repo/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRandomBytes } from "expo-crypto";

/** The bucket profile pictures live in. Public to read, own folder to write. */
export const AVATAR_BUCKET = "avatars";

/** What the picker hands back once a person has chosen or taken a photo. */
export interface ChosenPhoto {
  /** The file's bytes, already base64, which is how the picker returns them. */
  base64: string;
  /** Decides the stored file's extension and its content type. */
  mimeType: string;
}

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const DEFAULT_MIME = "image/jpeg";
const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BITS_PER_BASE64_DIGIT = 6;
const BITS_PER_BYTE = 8;
/** Shifting left by six bits and by eight, written as the multiplication it is. */
const BASE64_RADIX = 2 ** BITS_PER_BASE64_DIGIT;
const BYTE_RADIX = 2 ** BITS_PER_BYTE;

/**
 * Turns the base64 the picker returns into the bytes storage stores.
 *
 * Written out rather than reaching for `atob`, which React Native provides on
 * some versions and not others, or for a package whose whole job is this. Four
 * base64 digits carry three bytes: the loop collects six bits at a time and
 * emits a byte whenever eight have arrived.
 *
 * The bit work is arithmetic because the project's lint rules rule out bitwise
 * operators, and the two are the same thing here — multiplying by 64 shifts six
 * bits in, dividing by the leftover shifts them back out. Nothing gets near the
 * 32 bit boundary that makes the difference matter: `collected` holds at most 14
 * bits at a time.
 *
 * Padding needs no special case. `=` is not in the alphabet, so it contributes
 * nothing and the leftover bits are dropped, which is what padding means.
 */
export function decodeBase64(value: string): Uint8Array {
  const bytes: number[] = [];
  let collected = 0;
  let bitCount = 0;

  for (const character of value) {
    const digit = BASE64_ALPHABET.indexOf(character);

    if (digit < 0) {
      continue;
    }

    collected = collected * BASE64_RADIX + digit;
    bitCount += BITS_PER_BASE64_DIGIT;

    if (bitCount >= BITS_PER_BYTE) {
      bitCount -= BITS_PER_BYTE;

      const leftover = 2 ** bitCount;

      bytes.push(Math.floor(collected / leftover) % BYTE_RADIX);
      collected %= leftover;
    }
  }

  return Uint8Array.from(bytes);
}

/**
 * Where one person's picture goes.
 *
 * The owner's id is the first segment because that is what the storage policies
 * and the `profiles_avatar_path_owned` constraint both match on: one person's
 * folder is the unit of ownership.
 *
 * The rest of the name is fresh every time rather than a fixed `avatar.jpg`. A
 * stable name would leave the public URL unchanged after a new photo, and the
 * image already on screen would keep showing from cache.
 */
export function buildAvatarPath(
  userId: string,
  mimeType: string,
  uniqueSuffix: string
): string {
  return `${userId}/${uniqueSuffix}.${MIME_EXTENSIONS[toStoredMimeType(mimeType)]}`;
}

/**
 * The type the object is stored and named as.
 *
 * The name and the declared type have to come from the same answer. Falling the
 * extension back to jpg while still declaring the picker's own type would upload
 * a `.jpg` announced as something the bucket does not accept, and the person
 * would be told the whole profile failed to save.
 */
export function toStoredMimeType(mimeType: string): string {
  return mimeType in MIME_EXTENSIONS ? mimeType : DEFAULT_MIME;
}

/** Bytes of name, which is plenty to never repeat within one person's folder. */
const AVATAR_NAME_BYTES = 8;

/**
 * A name no previous picture of this person has had.
 *
 * The public URL is built from the path, so a repeated name would leave the
 * address unchanged and the picture already on screen would keep coming from
 * cache. Random rather than a counter or a timestamp: nothing here needs to be
 * ordered, and a name says nothing about when the photo was taken.
 */
export function createAvatarName(): string {
  return bytesToHex(getRandomBytes(AVATAR_NAME_BYTES));
}

/** The address a stored picture is served from, for this app's Supabase. */
export function readAvatarPublicUrl(
  client: SupabaseClient<Database>,
  path: string
): string {
  return client.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * The picture a profile should show.
 *
 * A picture the person chose beats one their sign-in provider offered, and the
 * path is turned into a URL here rather than stored as one: the same row is read
 * from a simulator, a device and production, each reaching storage on a
 * different host.
 */
export function resolveAvatarUrl(
  client: SupabaseClient<Database>,
  profile: { avatarPath: string | null; avatarUrl: string | null }
): string | null {
  if (profile.avatarPath) {
    return readAvatarPublicUrl(client, profile.avatarPath);
  }

  return profile.avatarUrl;
}

/**
 * Puts a chosen photo in the person's own folder and answers with its path.
 *
 * Uploads before the profile row is touched, so a failure here leaves the saved
 * profile exactly as it was rather than pointing at a file that never arrived.
 */
export async function uploadAvatar(
  client: SupabaseClient<Database>,
  userId: string,
  photo: ChosenPhoto,
  uniqueSuffix: string
): Promise<string> {
  const path = buildAvatarPath(userId, photo.mimeType, uniqueSuffix);
  const { error } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(path, decodeBase64(photo.base64), {
      contentType: toStoredMimeType(photo.mimeType),
    });

  if (error) {
    throw error;
  }

  return path;
}

/**
 * Clears out everything in the person's folder except the file named.
 *
 * Runs after the profile row already points at the new picture, so a failure
 * here costs a leftover file rather than a profile pointing at a deleted one.
 * Pass no `keep` to empty the folder, which is what deleting a picture does.
 */
export async function removeOtherAvatars(
  client: SupabaseClient<Database>,
  userId: string,
  keep?: string
): Promise<void> {
  const folder = client.storage.from(AVATAR_BUCKET);
  const { data, error } = await folder.list(userId);

  if (error || !data) {
    return;
  }

  const stale = data
    .map((entry) => `${userId}/${entry.name}`)
    .filter((path) => path !== keep);

  if (stale.length > 0) {
    await folder.remove(stale);
  }
}
