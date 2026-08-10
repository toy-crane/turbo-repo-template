import { useCallback, useState } from "react";

import {
  type AuthFailure,
  classifyAuthError,
} from "@/features/auth/api/auth-errors";
import { sendEmailCode } from "@/features/auth/api/email-otp";
import { getSupabaseClient } from "@/shared/supabase/client";
import { isValidEmail, normalizeEmail } from "./email-code";
import { useGuardedAction } from "./use-guarded-action";

export interface EmailRequest {
  changeEmail: (value: string) => void;
  email: string;
  failure: AuthFailure | undefined;
  isBusy: boolean;
  /**
   * False only while the field is empty, which is what disables the button.
   *
   * A malformed address leaves the button live on purpose: pressing it is how
   * the person finds out what is wrong. Disabling it would leave them holding a
   * dead button with nothing telling them why.
   */
  isSendable: boolean;
  submit: () => void;
}

/**
 * The email screen's state.
 *
 * `onSent` runs only after a code is actually on its way, so the screen decides
 * where to go next rather than this hook reaching for the router.
 */
export function useEmailRequest(onSent: (email: string) => void): EmailRequest {
  const [email, setEmail] = useState("");
  const { clearFailure, failure, isBusy, run, setFailure } =
    useGuardedAction<"send">();

  const changeEmail = useCallback(
    (value: string) => {
      setEmail(value);
      // The person is already fixing it, so the message has done its job.
      clearFailure();
    },
    [clearFailure]
  );

  const submit = useCallback(() => {
    const address = normalizeEmail(email);

    if (!isValidEmail(address)) {
      setFailure({
        kind: "invalidEmail",
        message: "이메일 주소를 다시 입력해 주세요.",
      });

      return;
    }

    run("send", async () => {
      try {
        await sendEmailCode(getSupabaseClient(), address);
      } catch (error) {
        // Being over the send limit means a code went out recently and is
        // still valid, so the person needs the input, not a closed door.
        // The code screen opens with its countdown already running, which is
        // the same thing the limit is telling them.
        if (classifyAuthError(error).kind !== "rateLimited") {
          throw error;
        }
      }
    }).then((sent) => {
      if (sent) {
        onSent(address);
      }
    });
  }, [email, onSent, run, setFailure]);

  return {
    changeEmail,
    email,
    failure,
    isBusy,
    isSendable: email.trim().length > 0,
    submit,
  };
}
