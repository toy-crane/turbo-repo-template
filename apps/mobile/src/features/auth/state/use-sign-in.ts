import { useCallback, useEffect, useRef, useState } from "react";

import { signInWithApple } from "@/features/auth/api/apple-sign-in";
import {
  type AuthFailure,
  classifyAuthError,
} from "@/features/auth/api/auth-errors";
import { sendEmailCode, verifyEmailCode } from "@/features/auth/api/email-otp";
import { signInWithGoogle } from "@/features/auth/api/google-sign-in";
import {
  completeProviderSignIn,
  type ProviderSignInResult,
} from "@/features/auth/api/provider-sign-in";
import { RESEND_COOLDOWN_SECONDS } from "@/features/auth/config/email-otp";
import { getSupabaseClient } from "@/shared/supabase/client";
import {
  isCompleteCode,
  isValidEmail,
  normalizeEmail,
  toCodeDigits,
} from "./email-code";

const SECOND_MS = 1000;

/** Which control the person is waiting on. Also what blocks a second run. */
export type PendingAction = "apple" | "code" | "email" | "google" | "resend";

/** Where the message belongs, so it appears next to what caused it. */
export type FailureScope = "code" | "email" | "provider";

export interface ScopedFailure extends AuthFailure {
  scope: FailureScope;
}

export interface SignInForm {
  changeCode: (value: string) => void;
  changeEmail: (value: string) => void;
  code: string;
  confirmCode: () => void;
  editEmail: () => void;
  email: string;
  failure: ScopedFailure | undefined;
  isBusy: boolean;
  isCodeStep: boolean;
  pending: PendingAction | undefined;
  resendCode: () => void;
  secondsLeft: number;
  startApple: () => void;
  startGoogle: () => void;
  submitEmail: () => void;
  verifyCode: (value: string) => void;
}

/**
 * Everything the sign-in screen has to remember: which step it is on, which
 * control is waiting, what failed and where the message belongs, and how long
 * until another code may be requested.
 *
 * It lives apart from the screen because these are the parts that must not
 * drift — a second press starting a second sign-in, or a countdown that keeps
 * running after the person went back to the address.
 */
export function useSignIn(): SignInForm {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isCodeStep, setIsCodeStep] = useState(false);
  const [pending, setPending] = useState<PendingAction | undefined>();
  const [failure, setFailure] = useState<ScopedFailure | undefined>();
  const [secondsLeft, setSecondsLeft] = useState(0);
  const isBusy = pending !== undefined;
  const running = useRef<PendingAction | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const stopCountdown = useCallback(() => {
    if (timer.current !== undefined) {
      clearInterval(timer.current);
      timer.current = undefined;
    }
  }, []);

  useEffect(() => stopCountdown, [stopCountdown]);

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

  /**
   * One entry point for every action this form can start. It is what keeps a
   * second press from starting a second attempt, and what guarantees the
   * control comes out of its pending state on every path, including the ones
   * that throw.
   */
  const run = useCallback(
    async (
      action: PendingAction,
      scope: FailureScope,
      work: () => Promise<void>
    ) => {
      // The ref, not the state, is what stops a double tap. Two presses in the
      // same frame both read the state from before the first one, so a state
      // check would let the second through and start a second sign-in.
      if (running.current !== undefined) {
        return;
      }

      running.current = action;
      setPending(action);
      setFailure(undefined);

      try {
        await work();
      } catch (error) {
        const classified = classifyAuthError(error);

        // Closing a provider sheet is a decision, not a failure. Saying
        // something went wrong would be both untrue and alarming.
        if (classified.kind !== "cancelled") {
          setFailure({ ...classified, scope });
        }
      } finally {
        running.current = undefined;
        setPending(undefined);
      }
    },
    []
  );

  const signInWithProvider = useCallback(
    (
      action: "apple" | "google",
      start: () => Promise<ProviderSignInResult | undefined>
    ) =>
      run(action, "provider", async () => {
        const result = await start();

        // Undefined means the person closed the provider's sheet.
        if (result) {
          await completeProviderSignIn(getSupabaseClient(), action, result);
        }
      }),
    [run]
  );

  /**
   * Moves to the code step and restarts the wait.
   *
   * Called whether or not the send succeeded: the server counts a send the app
   * could not complete, and the countdown is the app's promise about when the
   * next one is allowed.
   */
  const enterCodeStep = useCallback(
    (address: string) => {
      setEmail(address);
      setCode("");
      setIsCodeStep(true);
      startCountdown();
    },
    [startCountdown]
  );

  const requestCode = useCallback(
    (action: "email" | "resend") => {
      const address = normalizeEmail(email);

      if (!isValidEmail(address)) {
        setFailure({
          kind: "invalidEmail",
          message: "이메일 주소를 다시 확인해 주세요.",
          scope: "email",
        });

        return;
      }

      return run(action, action === "resend" ? "code" : "email", async () => {
        try {
          await sendEmailCode(getSupabaseClient(), address);
        } catch (error) {
          const sendFailure = classifyAuthError(error);

          if (sendFailure.kind !== "rateLimited") {
            throw error;
          }

          // Being over the send limit means a code went out recently and is
          // still valid, so the person needs the input, not a closed door.
          // Leaving them on this step would strand them with a usable code and
          // no screen that accepts it.
          enterCodeStep(address);
          setFailure({
            ...sendFailure,
            message:
              "이미 보낸 코드를 입력해 주세요. 새 코드는 잠시 뒤에 받을 수 있습니다.",
            scope: "code",
          });

          return;
        }

        enterCodeStep(address);
      });
    },
    [email, enterCodeStep, run]
  );

  const verifyCode = useCallback(
    (value: string) => {
      if (!isCompleteCode(value)) {
        return;
      }

      return run("code", "code", () =>
        verifyEmailCode(
          getSupabaseClient(),
          normalizeEmail(email),
          toCodeDigits(value)
        )
      );
    },
    [email, run]
  );

  const changeCode = useCallback((value: string) => {
    setCode(toCodeDigits(value));
  }, []);

  const confirmCode = useCallback(() => verifyCode(code), [code, verifyCode]);

  const submitEmail = useCallback(() => requestCode("email"), [requestCode]);

  const resendCode = useCallback(() => requestCode("resend"), [requestCode]);

  const startGoogle = useCallback(
    () => signInWithProvider("google", signInWithGoogle),
    [signInWithProvider]
  );

  const startApple = useCallback(
    () => signInWithProvider("apple", signInWithApple),
    [signInWithProvider]
  );

  const editEmail = useCallback(() => {
    stopCountdown();
    setSecondsLeft(0);
    setIsCodeStep(false);
    setCode("");
    setFailure(undefined);
  }, [stopCountdown]);

  return {
    changeCode,
    changeEmail: setEmail,
    code,
    confirmCode,
    editEmail,
    email,
    failure,
    isBusy,
    isCodeStep,
    pending,
    resendCode,
    secondsLeft,
    startApple,
    startGoogle,
    submitEmail,
    verifyCode,
  };
}
