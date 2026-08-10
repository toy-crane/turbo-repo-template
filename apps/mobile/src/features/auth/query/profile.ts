import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  type ProfileIdentity,
  readProfile,
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
