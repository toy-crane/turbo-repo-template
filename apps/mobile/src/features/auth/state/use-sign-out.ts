import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { signOut } from "@/features/auth/api/sign-out";
import { getSupabaseClient } from "@/shared/supabase/client";

export interface SignOutState {
  /** What to tell the person when the session outlived the attempt. */
  failure: string | undefined;
  isSigningOut: boolean;
  requestSignOut: () => Promise<void>;
}

/**
 * Signing out, as a screen needs it: whether it is running, what to say when it
 * failed, and the promise that the previous user's cached data is gone either
 * way.
 */
export function useSignOut(): SignOutState {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [failure, setFailure] = useState<string | undefined>();
  const queryClient = useQueryClient();
  const running = useRef<"idle" | "running">("idle");

  const requestSignOut = useCallback(async () => {
    // The ref, not the state, is what blocks the second press: two taps in the
    // same frame both read the state from before the first one.
    if (running.current === "running") {
      return;
    }

    running.current = "running";
    setIsSigningOut(true);
    setFailure(undefined);

    try {
      await signOut(getSupabaseClient());
    } catch (error) {
      // Reaching this means the local session survived, so the screen that
      // started this is still on top and can offer the retry.
      setFailure(
        `로그아웃을 끝내지 못했습니다. 다시 시도해 주세요. (${error instanceof Error ? error.message : String(error)})`
      );
    } finally {
      // The cache is emptied whatever else failed, or the next person to sign
      // in on this device reads the previous user's data out of it.
      queryClient.clear();
      running.current = "idle";
      setIsSigningOut(false);
    }
  }, [queryClient]);

  return { failure, isSigningOut, requestSignOut };
}
