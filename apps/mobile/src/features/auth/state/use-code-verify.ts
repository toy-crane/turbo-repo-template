import { useCallback, useEffect, useState } from "react";

import type { AuthFailure } from "@/features/auth/api/auth-errors";
import { sendEmailCode, verifyEmailCode } from "@/features/auth/api/email-otp";
import { RESEND_COOLDOWN_SECONDS } from "@/features/auth/config/email-otp";
import { getSupabaseClient } from "@/shared/supabase/client";
import { isCompleteCode, toCodeDigits } from "./email-code";
import { useGuardedAction } from "./use-guarded-action";

const SECOND_MS = 1000;

export type CodeAction = "resend" | "verify";

export interface CodeVerify {
  changeCode: (value: string) => void;
  code: string;
  failure: AuthFailure | undefined;
  isBusy: boolean;
  pending: CodeAction | undefined;
  resend: () => void;
  /** Bumped on every failed attempt so the input can take focus again. */
  resetCount: number;
  secondsLeft: number;
}

/**
 * The code screen's state: the six digits, the wait before another code may be
 * requested, and what happens when the code does not match.
 *
 * A wrong code clears the boxes rather than leaving the person to delete six
 * digits themselves, and `resetCount` tells the input to take focus again so
 * they can type straight away. A press the guard skipped is left alone: it
 * never reached the server, so there is nothing to undo.
 */
export function useCodeVerify(email: string): CodeVerify {
  const [code, setCode] = useState("");
  // A deadline rather than a running count. JS timers stop while the app is in
  // the background, and this flow sends the person to their mail app: a
  // decrementing counter would resume where it froze and keep the button
  // locked long after the server's window had passed.
  const [deadline, setDeadline] = useState(
    () => Date.now() + RESEND_COOLDOWN_SECONDS * SECOND_MS
  );
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [resetCount, setResetCount] = useState(0);
  const { clearFailure, failure, isBusy, pending, run } =
    useGuardedAction<CodeAction>();

  // The effect owns the interval, so React clears it on unmount and on every
  // new deadline. Nothing outside can leave one running.
  useEffect(() => {
    const tick = () => {
      setSecondsLeft(
        Math.max(Math.ceil((deadline - Date.now()) / SECOND_MS), 0)
      );
    };

    tick();

    const timer = setInterval(tick, SECOND_MS);

    return () => clearInterval(timer);
  }, [deadline]);

  const verify = useCallback(
    (value: string) => {
      run("verify", () =>
        verifyEmailCode(getSupabaseClient(), email, toCodeDigits(value))
      ).then((outcome) => {
        // Only a code the server actually rejected gets cleared. A press the
        // guard skipped never reached the server, and wiping the field for it
        // would delete digits while the first attempt is still in flight.
        if (outcome === "failed") {
          // Leaving the wrong digits in place would make the person delete six
          // characters before they could try again.
          setCode("");
          setResetCount((count) => count + 1);
        }
      });
    },
    [email, run]
  );

  const changeCode = useCallback(
    (value: string) => {
      const digits = toCodeDigits(value);

      setCode(digits);
      clearFailure();

      if (isCompleteCode(digits)) {
        verify(digits);
      }
    },
    [clearFailure, verify]
  );

  const resend = useCallback(() => {
    run("resend", () => sendEmailCode(getSupabaseClient(), email)).then(
      (outcome) => {
        // Only a send that reached the server restarts the wait. Locking the
        // button for another minute after a failed send would leave the person
        // with no code and no way to ask for one.
        if (outcome !== "ok") {
          return;
        }

        setCode("");
        setDeadline(Date.now() + RESEND_COOLDOWN_SECONDS * SECOND_MS);
        setResetCount((count) => count + 1);
      }
    );
  }, [email, run]);

  return {
    changeCode,
    code,
    failure,
    isBusy,
    pending,
    resend,
    resetCount,
    secondsLeft,
  };
}
