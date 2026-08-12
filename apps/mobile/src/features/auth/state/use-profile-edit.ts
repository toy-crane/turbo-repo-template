import { useCallback, useEffect, useRef, useState } from "react";

import type { ChosenPhoto } from "@/features/auth/api/avatar";
import {
  isUsernameLocked as isLockedError,
  isUsernameTaken,
} from "@/features/auth/api/profile";
import {
  readProfileAvatarUrl,
  useProfile,
  useSaveProfileEdit,
} from "@/features/auth/query/profile";
import {
  useUsernameStatus,
  useUsernameSuggestions,
} from "@/features/auth/query/username";
import {
  CHECKING_USERNAME_MESSAGE,
  SAVE_FAILED_MESSAGE,
  USERNAME_LOCKED_MESSAGE,
  USERNAME_POLICY_NOTE,
  usernameUnlockNote,
} from "@/features/auth/ui/profile-labels";
import { useAuthSession } from "./auth-session";
import {
  checkNickname,
  checkUsernameFormat,
  isUsernameWellFormed,
  NICKNAME_TOO_LONG_MESSAGE,
  normalizeNickname,
  normalizeUsernameInput,
  USERNAME_MESSAGES,
  type UsernameTrouble,
} from "./profile-identity";
import { USERNAME_CHECK_DELAY_MS } from "./use-username-step";
import { isUsernameLockActive } from "./username-lock";

/** The picture the person is proposing: unset, deleted, or a new one. */
type PhotoDraft = { photo: ChosenPhoto; uri: string } | null | undefined;

export interface ProfileEdit {
  /** The picture to show right now, draft included. Null draws the initial. */
  avatarUrl: string | null;
  canSave: boolean;
  changeNickname: (value: string) => void;
  changeUsername: (value: string) => void;
  chooseSuggestion: (value: string) => void;
  deletePhoto: () => void;
  /** Whether 현재 사진 삭제 belongs in the photo menu at all. */
  hasPhoto: boolean;
  isCheckingUsername: boolean;
  /**
   * The saved profile has arrived, so the fields can be seeded with it. The
   * native text fields take their starting text once, on mount, so the screen
   * that owns them must not appear before there is something to put in them.
   */
  isReady: boolean;
  isSaving: boolean;
  /** The 30 day lock is on, so the id field is read-only. */
  isUsernameLocked: boolean;
  nickname: string;
  nicknameMessage: string | undefined;
  /** The standing rule, or the date the id can change again. */
  policyNote: string;
  save: (confirmChange: (proceed: () => void) => void) => void;
  saveFailure: string | undefined;
  setPhoto: (photo: ChosenPhoto, uri: string) => void;
  suggestions: string[];
  username: string;
  usernameMessage: string | undefined;
}

/**
 * The 프로필 수정 screen's draft, from opening it to a saved profile.
 *
 * Everything typed here is local until 저장. Leaving the screen drops the draft
 * with it, which is what makes the back arrow a real cancel rather than a save
 * that happened to be interrupted.
 */
export function useProfileEdit(onSaved: () => void): ProfileEdit {
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const save = useSaveProfileEdit(userId);

  const savedNickname = profile?.displayName ?? "";
  const savedUsername = profile?.username ?? "";

  const [nickname, setNickname] = useState(savedNickname);
  const [username, setUsername] = useState(savedUsername);
  const [photoDraft, setPhotoDraft] = useState<PhotoDraft>();
  const [saveFailure, setSaveFailure] = useState<string | undefined>();
  const [collidedWith, setCollidedWith] = useState<string | undefined>();
  const isSaving = useRef(false);

  // The profile arrives after the first render, and once loaded it only changes
  // because this screen saved it. Seeding on arrival is what puts the current
  // values in the fields without overwriting what somebody is typing.
  const seededFor = useRef<string | undefined>(undefined);

  if (profile && seededFor.current !== userId) {
    seededFor.current = userId;
    setNickname(savedNickname);
    setUsername(savedUsername);
  }

  const isLocked = isUsernameLockActive(profile?.usernameLockedUntil);
  const isUsernameUnchanged = username === savedUsername;

  const [settled, setSettled] = useState(username);

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
  // The id the person already holds needs no answer: `username_status` skips
  // their own row, so it would say available, and asking costs a request every
  // time the screen opens.
  const shouldCheck = isWellFormed && hasSettled && !isUsernameUnchanged;
  const status = useUsernameStatus(settled, shouldCheck);
  const answer = hasSettled && !status.isFetching ? status.data : undefined;
  const hasCollided = collidedWith === username;

  const trouble = readTrouble({
    answer,
    formatProblem,
    hasCollided,
    isCheckFailed: shouldCheck && !status.isFetching && status.isError,
    isUnchanged: isUsernameUnchanged,
  });

  const suggestions = useUsernameSuggestions(
    username,
    trouble === "reserved" || trouble === "taken"
  );

  const isCheckingUsername =
    !isUsernameUnchanged && isWellFormed && (!hasSettled || status.isFetching);
  const isUsernameUsable =
    isUsernameUnchanged || (!hasCollided && answer === "available");

  const nicknameProblem = checkNickname(nickname);
  const hasChanges =
    normalizeNickname(nickname) !== savedNickname ||
    !isUsernameUnchanged ||
    photoDraft !== undefined;

  const changeNickname = useCallback((value: string) => {
    setSaveFailure(undefined);
    setNickname(value);
  }, []);

  const changeUsername = useCallback((value: string) => {
    setSaveFailure(undefined);
    setUsername(normalizeUsernameInput(value));
  }, []);

  const setPhoto = useCallback((photo: ChosenPhoto, uri: string) => {
    setSaveFailure(undefined);
    setPhotoDraft({ photo, uri });
  }, []);

  const deletePhoto = useCallback(() => {
    setSaveFailure(undefined);
    setPhotoDraft(null);
  }, []);

  const canSave =
    hasChanges &&
    nicknameProblem === undefined &&
    isUsernameUsable &&
    !(isCheckingUsername || save.isPending);

  const commit = useCallback(() => {
    // The ref alongside the pending flag stops a double press: two presses in one
    // frame both read the mutation's state from before the first, and only the
    // ref has already been written by then.
    if (save.isPending || isSaving.current) {
      return;
    }

    isSaving.current = true;
    setSaveFailure(undefined);

    save.mutate(
      {
        displayName: normalizeNickname(nickname),
        // Left out entirely when the picture was never touched, so saving a
        // nickname does not clear a photo the person did not open the menu for.
        ...(photoDraft === undefined
          ? {}
          : { photo: photoDraft === null ? null : photoDraft.photo }),
        username,
      },
      {
        onError: (error) => {
          isSaving.current = false;

          if (isUsernameTaken(error)) {
            setCollidedWith(username);

            return;
          }

          setSaveFailure(
            isLockedError(error) ? USERNAME_LOCKED_MESSAGE : SAVE_FAILED_MESSAGE
          );
        },
        onSuccess: () => {
          isSaving.current = false;
          // The draft has become the saved profile, so the photo is no longer a
          // proposal. Left set, the screen would keep showing the local file
          // rather than the stored one.
          setPhotoDraft(undefined);
          onSaved();
        },
      }
    );
  }, [nickname, onSaved, photoDraft, save, username]);

  const requestSave = useCallback(
    (confirmChange: (proceed: () => void) => void) => {
      if (!canSave) {
        return;
      }

      // Only a changed id needs asking. Confirming a save that keeps the same id
      // would teach people to dismiss the one dialog that matters.
      if (isUsernameUnchanged) {
        commit();

        return;
      }

      confirmChange(commit);
    },
    [canSave, commit, isUsernameUnchanged]
  );

  const draftAvatarUrl = readDraftAvatarUrl(photoDraft, profile);

  return {
    avatarUrl: draftAvatarUrl,
    canSave,
    changeNickname,
    changeUsername,
    chooseSuggestion: changeUsername,
    deletePhoto,
    hasPhoto: draftAvatarUrl !== null,
    isCheckingUsername,
    isReady: profile !== undefined,
    isSaving: save.isPending,
    isUsernameLocked: isLocked,
    nickname,
    nicknameMessage:
      nicknameProblem === "tooLong" ? NICKNAME_TOO_LONG_MESSAGE : undefined,
    policyNote: readPolicyNote(isLocked, profile?.usernameLockedUntil),
    save: requestSave,
    saveFailure,
    setPhoto,
    suggestions: suggestions.data ?? [],
    username,
    usernameMessage: readUsernameMessage(isCheckingUsername, trouble),
  };
}

/**
 * The picture on screen right now: the unsaved one if there is a draft, the
 * saved one otherwise. A draft of `null` is a deletion, which shows nothing.
 */
function readDraftAvatarUrl(
  photoDraft: PhotoDraft,
  profile: Parameters<typeof readProfileAvatarUrl>[0]
): string | null {
  if (photoDraft === undefined) {
    return readProfileAvatarUrl(profile);
  }

  // `null` is the person having deleted their picture, which shows the initial.
  return photoDraft === null ? null : photoDraft.uri;
}

/**
 * The standing rule, or the date this person can change their id again.
 *
 * They replace each other rather than stack: once there is a real date, the
 * general rule is the less useful of the two things to read.
 */
function readPolicyNote(
  isLocked: boolean,
  lockedUntil: string | null | undefined
): string {
  return isLocked && lockedUntil
    ? usernameUnlockNote(lockedUntil)
    : USERNAME_POLICY_NOTE;
}

/** The one line under the fields, or nothing at all while everything is fine. */
function readUsernameMessage(
  isChecking: boolean,
  trouble: UsernameTrouble | undefined
): string | undefined {
  if (isChecking) {
    return CHECKING_USERNAME_MESSAGE;
  }

  return trouble ? USERNAME_MESSAGES[trouble] : undefined;
}

/**
 * The one thing worth saying about the id right now, most local first.
 *
 * The id the person already holds is not a problem to report, so it short
 * circuits before anything else: an unchanged value is theirs by definition.
 */
function readTrouble({
  answer,
  formatProblem,
  hasCollided,
  isCheckFailed,
  isUnchanged,
}: {
  answer: string | undefined;
  formatProblem: UsernameTrouble | undefined;
  hasCollided: boolean;
  isCheckFailed: boolean;
  isUnchanged: boolean;
}): UsernameTrouble | undefined {
  if (isUnchanged) {
    return;
  }

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
