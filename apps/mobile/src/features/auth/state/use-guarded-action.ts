import { useCallback, useRef, useState } from "react";

import {
  type AuthFailure,
  classifyAuthError,
} from "@/features/auth/api/auth-errors";

/**
 * One entry point for every sign-in action, shared by the three screens.
 *
 * It is what keeps a second press from starting a second attempt, and what
 * guarantees the control comes out of its pending state on every path,
 * including the ones that throw.
 */
export interface GuardedAction<Action extends string> {
  /** Drops a message the person has already started fixing. */
  clearFailure: () => void;
  failure: AuthFailure | undefined;
  isBusy: boolean;
  /** Which control the person is waiting on. */
  pending: Action | undefined;
  /**
   * Resolves true when the work finished without a failure, so a caller can
   * move on only when it actually succeeded. A press that was swallowed
   * because another action was already running resolves false.
   */
  run: (action: Action, work: () => Promise<void>) => Promise<boolean>;
  setFailure: (failure: AuthFailure) => void;
}

export function useGuardedAction<
  Action extends string,
>(): GuardedAction<Action> {
  const [pending, setPending] = useState<Action | undefined>();
  const [failure, setFailure] = useState<AuthFailure | undefined>();
  const running = useRef<Action | undefined>(undefined);

  const clearFailure = useCallback(() => {
    setFailure(undefined);
  }, []);

  const run = useCallback(async (action: Action, work: () => Promise<void>) => {
    // The ref, not the state, is what stops a double tap. Two presses in the
    // same frame both read the state from before the first one, so a state
    // check would let the second through and start a second sign-in.
    if (running.current !== undefined) {
      return false;
    }

    running.current = action;
    setPending(action);
    setFailure(undefined);

    try {
      await work();

      return true;
    } catch (error) {
      const classified = classifyAuthError(error);

      // Closing a provider sheet is a decision, not a failure. Saying
      // something went wrong would be both untrue and alarming.
      if (classified.kind !== "cancelled") {
        setFailure(classified);
      }

      return false;
    } finally {
      running.current = undefined;
      setPending(undefined);
    }
  }, []);

  return {
    clearFailure,
    failure,
    isBusy: pending !== undefined,
    pending,
    run,
    setFailure,
  };
}
