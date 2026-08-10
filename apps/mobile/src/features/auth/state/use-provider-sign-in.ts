import { useCallback } from "react";
import { signInWithApple } from "@/features/auth/api/apple-sign-in";
import type { AuthFailure } from "@/features/auth/api/auth-errors";
import { signInWithGoogle } from "@/features/auth/api/google-sign-in";
import {
  completeProviderSignIn,
  type ProviderSignInResult,
} from "@/features/auth/api/provider-sign-in";
import { getSupabaseClient } from "@/shared/supabase/client";
import { useGuardedAction } from "./use-guarded-action";

export type ProviderAction = "apple" | "google";

export interface ProviderSignIn {
  failure: AuthFailure | undefined;
  isBusy: boolean;
  pending: ProviderAction | undefined;
  startApple: () => void;
  startGoogle: () => void;
}

/** What the login-method screen needs: the two provider buttons and their state. */
export function useProviderSignIn(): ProviderSignIn {
  const { failure, isBusy, pending, run } = useGuardedAction<ProviderAction>();

  const start = useCallback(
    (
      action: ProviderAction,
      begin: () => Promise<ProviderSignInResult | undefined>
    ) =>
      run(action, async () => {
        const result = await begin();

        // Undefined means the person closed the provider's sheet.
        if (result) {
          await completeProviderSignIn(getSupabaseClient(), action, result);
        }
      }),
    [run]
  );

  const startGoogle = useCallback(
    () => start("google", signInWithGoogle),
    [start]
  );

  const startApple = useCallback(
    () => start("apple", signInWithApple),
    [start]
  );

  return { failure, isBusy, pending, startApple, startGoogle };
}
