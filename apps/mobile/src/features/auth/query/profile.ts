import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  type ChosenPhoto,
  createAvatarName,
  removeOtherAvatars,
  resolveAvatarUrl,
  uploadAvatar,
} from "@/features/auth/api/avatar";
import {
  type ProfileIdentity,
  readProfile,
  saveProfileEdit,
  saveProfileIdentity,
  type UserProfile,
} from "@/features/auth/api/profile";
import { getSupabaseClient } from "@/shared/supabase/client";

/**
 * Keyed by user id so signing in as someone else cannot read the previous
 * person's profile out of the cache. Signing out empties the cache as well.
 */
export function profileQueryKey(userId: string) {
  return ["profile", userId] as const;
}

export function profileQueryOptions(userId: string) {
  return queryOptions<UserProfile>({
    queryFn: () => readProfile(getSupabaseClient(), userId),
    queryKey: profileQueryKey(userId),
    // This read decides which half of the app exists, so someone is watching a
    // blank screen while it runs. One quick retry covers a blip; past that they
    // are better served by a button they can press than by a longer wait.
    retry: 1,
  });
}

/**
 * The signed-in person's profile. Waits while there is no user id, which is
 * every frame before the session is restored.
 */
export function useProfile(userId: string | undefined) {
  return useQuery({
    ...profileQueryOptions(userId ?? ""),
    enabled: userId !== undefined,
  });
}

/**
 * Stores the nickname and account id the person chose.
 *
 * The saved row goes straight into the cache rather than through a refetch:
 * this is the write that finishes onboarding, and the guard reads the same
 * cache to decide whether the app opens. Invalidating instead would leave a
 * gap where the profile is complete on the server and still unfinished here.
 */
export function useSaveProfileIdentity(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (identity: ProfileIdentity) =>
      saveProfileIdentity(getSupabaseClient(), userId ?? "", identity),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey(userId ?? ""), profile);
    },
  });
}

/**
 * What the edit screen sends when the person presses 저장.
 *
 * `photo` has three states rather than two. Left out, the picture is not part of
 * this save; `null` deletes it; a value replaces it. A screen that only knew
 * "picture or no picture" would clear the photo of anyone who came in to fix a
 * typo in their nickname.
 */
export interface ProfileEditDraft {
  displayName: string;
  photo?: ChosenPhoto | null;
  username: string;
}

/**
 * Saves the picture, the nickname and the account id together.
 *
 * The order is deliberate. The upload goes first, so a failed upload leaves the
 * profile untouched rather than pointing at a file that never arrived. The old
 * files are cleared last, after the row already names the new one, so a failure
 * there costs a leftover file rather than a profile pointing at a deleted
 * picture. Only the middle step decides whether the save succeeded.
 */
export function useSaveProfileEdit(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft: ProfileEditDraft) => {
      const client = getSupabaseClient();
      const owner = userId ?? "";
      let avatarPath: string | null | undefined;

      if (draft.photo !== undefined) {
        avatarPath =
          draft.photo === null
            ? null
            : await uploadAvatar(
                client,
                owner,
                draft.photo,
                createAvatarName()
              );
      }

      const profile = await saveProfileEdit(client, owner, {
        avatarPath,
        displayName: draft.displayName,
        username: draft.username,
      });

      if (draft.photo !== undefined) {
        await removeOtherAvatars(client, owner, avatarPath ?? undefined);
      }

      return profile;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey(userId ?? ""), profile);
    },
  });
}

/**
 * The picture to show for a profile, or null for the nickname's first letter.
 *
 * Here rather than in each screen because turning a stored path into an address
 * needs the client, and every screen showing a profile would otherwise reach for
 * it separately.
 */
export function readProfileAvatarUrl(
  profile: Pick<UserProfile, "avatarPath" | "avatarUrl"> | undefined
): string | null {
  if (!profile) {
    return null;
  }

  return resolveAvatarUrl(getSupabaseClient(), profile);
}
