import { useCallback, useEffect, useRef, useState } from "react";

import { classifyAuthError } from "@/features/auth/api/auth-errors";
import { isUsernameTaken } from "@/features/auth/api/profile";
import { useSaveProfileIdentity } from "@/features/auth/query/profile";
import {
  useUsernameStatus,
  useUsernameSuggestions,
} from "@/features/auth/query/username";
import { useAuthSession } from "./auth-session";
import {
  checkUsernameFormat,
  isUsernameWellFormed,
  normalizeNickname,
  normalizeUsernameInput,
  USERNAME_MESSAGES,
  type UsernameTrouble,
} from "./profile-identity";
import { useProfileOnboarding } from "./profile-onboarding";

/**
 * How long typing has to stop before the app asks whether the id is free.
 *
 * Exported because it is a timing contract, not a detail: a test drives it
 * rather than guessing at it, and the wait is what keeps one id from costing a
 * request per keystroke.
 */
export const USERNAME_CHECK_DELAY_MS = 400;

export interface UsernameStep {
  canSubmit: boolean;
  changeUsername: (value: string) => void;
  chooseSuggestion: (value: string) => void;
  /** The id is free: the screen shows a check and enables 시작하기. */
  isAvailable: boolean;
  /** The availability answer is the one thing the person can ask for again. */
  isCheckFailed: boolean;
  isChecking: boolean;
  isSaving: boolean;
  message: string | undefined;
  retryCheck: () => void;
  submit: () => void;
  suggestions: string[];
  username: string;
}

export function useUsernameStep(): UsernameStep {
  const { editUsername, nickname, username } = useProfileOnboarding();
  const { session } = useAuthSession();
  const save = useSaveProfileIdentity(session?.user.id);

  // The value typing has settled on. Everything remote is keyed off this one
  // rather than off `username`, so a half-typed id never reaches the server.
  const [settled, setSettled] = useState(username);
  /** The id that lost the race at save time, if any. */
  const [collidedWith, setCollidedWith] = useState<string | undefined>();
  const [saveFailure, setSaveFailure] = useState<string | undefined>();
  const isSaving = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(username);
    }, USERNAME_CHECK_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [username]);

  const formatProblem = checkUsernameFormat(username);
  const isWellFormed = isUsernameWellFormed(username);
  const hasSettled = settled === username;
  const status = useUsernameStatus(settled, isWellFormed && hasSettled);
  // Only an answer about the value on screen counts. While typing runs ahead of
  // the check, the previous id's answer is still in hand and would otherwise be
  // shown against text it was never about.
  const answer = hasSettled && !status.isFetching ? status.data : undefined;
  const hasCollided = collidedWith === username;

  const trouble = readTrouble({
    answer,
    formatProblem,
    hasCollided,
    isCheckFailed: hasSettled && !status.isFetching && status.isError,
  });

  const suggestions = useUsernameSuggestions(
    username,
    trouble === "reserved" || trouble === "taken"
  );

  const isAvailable = !hasCollided && answer === "available";
  const isChecking = isWellFormed && (!hasSettled || status.isFetching);

  const changeUsername = useCallback(
    (value: string) => {
      setSaveFailure(undefined);
      editUsername(normalizeUsernameInput(value));
    },
    [editUsername]
  );

  const submit = useCallback(() => {
    // The ref rather than the pending flag is what stops a double tap: two
    // presses in one frame both read the state from before the first.
    if (!isAvailable || isSaving.current) {
      return;
    }

    isSaving.current = true;
    setSaveFailure(undefined);

    save.mutate(
      { displayName: normalizeNickname(nickname), username },
      {
        onError: (error) => {
          isSaving.current = false;

          // Somebody took the id between the check and the save. The person
          // keeps both values and picks another spelling.
          if (isUsernameTaken(error)) {
            setCollidedWith(username);

            return;
          }

          setSaveFailure(classifyAuthError(error).message);
        },
        onSuccess: () => {
          isSaving.current = false;
        },
      }
    );
  }, [isAvailable, nickname, save, username]);

  return {
    canSubmit: isAvailable && !save.isPending,
    changeUsername,
    chooseSuggestion: changeUsername,
    isAvailable,
    isCheckFailed: trouble === "checkFailed",
    isChecking,
    isSaving: save.isPending,
    message: trouble ? USERNAME_MESSAGES[trouble] : saveFailure,
    retryCheck: () => {
      status.refetch();
    },
    submit,
    suggestions: suggestions.data ?? [],
    username,
  };
}

/**
 * The one thing worth saying about the id right now, most local first.
 *
 * A format problem outranks any answer from the server, because the server was
 * never asked about a value it would refuse to look at.
 */
function readTrouble({
  answer,
  formatProblem,
  hasCollided,
  isCheckFailed,
}: {
  answer: string | undefined;
  formatProblem: UsernameTrouble | undefined;
  hasCollided: boolean;
  isCheckFailed: boolean;
}): UsernameTrouble | undefined {
  if (formatProblem) {
    return formatProblem;
  }

  if (hasCollided) {
    return "taken";
  }

  if (isCheckFailed) {
    return "checkFailed";
  }

  if (answer === "reserved" || answer === "taken") {
    return answer;
  }
}
