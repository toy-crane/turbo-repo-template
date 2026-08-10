import { useCallback } from "react";

import { checkNickname, NICKNAME_TOO_LONG_MESSAGE } from "./profile-identity";
import { useProfileOnboarding } from "./profile-onboarding";

export interface NicknameStep {
  /** False while the value cannot go forward, which is what disables 다음. */
  canContinue: boolean;
  changeNickname: (value: string) => void;
  message: string | undefined;
  nickname: string;
  submit: () => void;
}

/**
 * The nickname screen's state.
 *
 * `다음` stores nothing. It moves to the account id screen, and the pair is
 * saved together from there — so a person who abandons onboarding halfway
 * leaves no half-written profile behind.
 *
 * An empty field shows no message. Nothing has gone wrong yet; the person has
 * simply not typed, and the disabled button already says so.
 */
export function useNicknameStep(onNext: () => void): NicknameStep {
  const { editNickname, nickname } = useProfileOnboarding();
  const problem = checkNickname(nickname);

  const submit = useCallback(() => {
    if (checkNickname(nickname) === undefined) {
      onNext();
    }
  }, [nickname, onNext]);

  return {
    canContinue: problem === undefined,
    changeNickname: editNickname,
    message: problem === "tooLong" ? NICKNAME_TOO_LONG_MESSAGE : undefined,
    nickname,
    submit,
  };
}
