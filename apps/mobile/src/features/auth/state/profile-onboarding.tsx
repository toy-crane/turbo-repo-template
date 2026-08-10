import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useProfile } from "@/features/auth/query/profile";
import { useAuthSession } from "@/features/auth/state/auth-session";
import { toUsernameCandidate } from "./profile-identity";

/**
 * The two values being chosen, held for as long as onboarding is open.
 *
 * They live in the stack's layout rather than in either screen because both
 * screens need them: going back from the account id has to find the nickname
 * still there, and the final save sends both at once. Nothing is written to the
 * server until that save, so closing the app starts the two screens over — a
 * half-finished draft on the server would be a third state to keep true.
 */
export interface ProfileOnboardingDraft {
  editNickname: (value: string) => void;
  editUsername: (value: string) => void;
  nickname: string;
  username: string;
}

const ProfileOnboardingContext = createContext<
  ProfileOnboardingDraft | undefined
>(undefined);

export function ProfileOnboardingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { session } = useAuthSession();
  const { data: profile } = useProfile(session?.user.id);
  const suggestedNickname = profile?.displayName ?? "";

  const [nickname, setNickname] = useState(suggestedNickname);
  const [isNicknameEdited, setIsNicknameEdited] = useState(false);
  // Built once, from the address this person signed in with. Rebuilding it on
  // every render would undo their typing.
  const [username, setUsername] = useState(() =>
    toUsernameCandidate(session?.user.email ?? "")
  );

  // A provider stores its name just after the session goes live, which can be
  // after this screen already read an empty profile. Adopting it when it
  // arrives is what puts a candidate in the field — but only while the field is
  // untouched, because a name that appears over what someone is typing is worse
  // than no name at all.
  useEffect(() => {
    if (!isNicknameEdited && suggestedNickname) {
      setNickname(suggestedNickname);
    }
  }, [isNicknameEdited, suggestedNickname]);

  const editNickname = useCallback((value: string) => {
    setIsNicknameEdited(true);
    setNickname(value);
  }, []);

  const draft = useMemo(
    () => ({ editNickname, editUsername: setUsername, nickname, username }),
    [editNickname, nickname, username]
  );

  return (
    <ProfileOnboardingContext.Provider value={draft}>
      {children}
    </ProfileOnboardingContext.Provider>
  );
}

export function useProfileOnboarding(): ProfileOnboardingDraft {
  const draft = useContext(ProfileOnboardingContext);

  if (!draft) {
    throw new Error(
      "useProfileOnboarding은 ProfileOnboardingProvider 안에서만 쓸 수 있습니다."
    );
  }

  return draft;
}
