import { useCallback, useRef, useState } from "react";

import {
  type AuthFailure,
  classifyAuthError,
} from "@/features/auth/api/auth-errors";

/**
 * What happened to a press.
 *
 * `skipped` is its own outcome rather than a second meaning for failure: the
 * guard drops a press while another action is already running, and a caller
 * that reads that as a failure will undo work the first press is still doing.
 * `cancelled` is the person closing a provider sheet, which is a decision.
 */
export type ActionOutcome = "cancelled" | "failed" | "ok" | "skipped";

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
   * Names what happened so each caller can react to the outcome it cares
   * about. Only `ok` means the work reached the server and finished.
   */
  run: (action: Action, work: () => Promise<void>) => Promise<ActionOutcome>;
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
      return "skipped" as const;
    }

    running.current = action;
    setPending(action);
    setFailure(undefined);

    try {
      await work();

      return "ok" as const;
    } catch (error) {
      const classified = classifyAuthError(error);

      // Closing a provider sheet is a decision, not a failure. Saying
      // something went wrong would be both untrue and alarming.
      if (classified.kind === "cancelled") {
        return "cancelled" as const;
      }

      setFailure(classified);

      return "failed" as const;
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
