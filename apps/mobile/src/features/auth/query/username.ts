import { useQuery } from "@tanstack/react-query";

import {
  readAvailableUsernames,
  readUsernameStatus,
  type UsernameStatus,
} from "@/features/auth/api/profile";
import { buildNumberedCandidates } from "@/features/auth/state/profile-identity";
import { getSupabaseClient } from "@/shared/supabase/client";

/** How many spellings the screen offers when the first choice is unavailable. */
export const SUGGESTION_COUNT = 3;

/**
 * Whether an account id can be taken, cached by the id itself.
 *
 * Caching by the value is what makes editing cheap: deleting a character and
 * typing it again answers from the cache instead of asking twice, and stepping
 * back to a spelling already checked shows its answer immediately.
 *
 * `candidate` arrives already settled — the screen waits for typing to stop
 * before passing it here — so this hook does no timing of its own.
 */
export function useUsernameStatus(candidate: string, enabled: boolean) {
  return useQuery<UsernameStatus>({
    enabled,
    queryFn: () => readUsernameStatus(getSupabaseClient(), candidate),
    queryKey: ["username-status", candidate] as const,
    // This runs again on the next keystroke and the person can ask for it
    // directly, so a silent retry only delays the answer they are waiting on.
    retry: false,
    // An availability answer is only as good as the moment it was given; the
    // save re-decides it against the unique constraint either way.
    staleTime: 0,
  });
}

/**
 * Free spellings of an id somebody else already holds.
 *
 * The pool is built here and confirmed by the server, so a suggestion cannot be
 * one that fails the moment it is pressed. Keyed by the id the person typed
 * rather than by the generated pool: the numbers are random, and a key that
 * changed on every render would ask again forever.
 */
export function useUsernameSuggestions(base: string, enabled: boolean) {
  return useQuery<string[]>({
    enabled,
    queryFn: async () => {
      const free = await readAvailableUsernames(
        getSupabaseClient(),
        buildNumberedCandidates(base)
      );

      return free.slice(0, SUGGESTION_COUNT);
    },
    queryKey: ["username-suggestions", base] as const,
    retry: false,
    // Suggestions are availability answers too. Another account can claim one
    // while this screen is away, so reopening must confirm the pool again.
    staleTime: 0,
  });
}
