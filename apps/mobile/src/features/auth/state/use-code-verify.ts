import { useCallback, useEffect, useRef, useState } from "react";

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
 * they can type straight away.
 */
export function useCodeVerify(email: string): CodeVerify {
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [resetCount, setResetCount] = useState(0);
  const { clearFailure, failure, isBusy, pending, run } =
    useGuardedAction<CodeAction>();
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const stopCountdown = useCallback(() => {
    if (timer.current !== undefined) {
      clearInterval(timer.current);
      timer.current = undefined;
    }
  }, []);

  const startCountdown = useCallback(() => {
    stopCountdown();
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    timer.current = setInterval(() => {
      setSecondsLeft((remaining) => {
        if (remaining <= 1) {
          stopCountdown();

          return 0;
        }

        return remaining - 1;
      });
    }, SECOND_MS);
  }, [stopCountdown]);

  // The code was sent just before this screen opened, so the wait starts here.
  useEffect(() => {
    startCountdown();

    return stopCountdown;
  }, [startCountdown, stopCountdown]);

  const verify = useCallback(
    (value: string) => {
      run("verify", () =>
        verifyEmailCode(getSupabaseClient(), email, toCodeDigits(value))
      ).then((ok) => {
        if (!ok) {
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
    run("resend", () => sendEmailCode(getSupabaseClient(), email)).then(() => {
      // Restarted either way: the server counts a send the app could not
      // complete, and the countdown is the app's promise about the next one.
      setCode("");
      startCountdown();
      setResetCount((count) => count + 1);
    });
  }, [email, run, startCountdown]);

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
