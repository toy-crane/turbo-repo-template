import { queryOptions, useQuery } from "@tanstack/react-query";

import { readProfile, type UserProfile } from "@/features/auth/api/profile";
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
