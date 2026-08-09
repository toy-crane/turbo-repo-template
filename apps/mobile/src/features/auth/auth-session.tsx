import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { getSupabaseClient } from "../../supabase/client";

/**
 * The app's one answer to "is someone signed in?".
 *
 * The fourth state the spec asks for, a broken Supabase configuration, belongs
 * to SupabaseGate one level up: without a usable client there is no session to
 * ask about, so this provider never mounts in that case.
 *
 * `checking` exists so the first frame shows neither screen. Rendering the
 * sign-in screen while a stored session is still loading would flash it at
 * every returning user, and rendering the app first would show protected
 * screens to someone who turns out to be signed out.
 */
export type AuthStatus = "checking" | "signedIn" | "signedOut";

export interface AuthSessionState {
  session: Session | null;
  status: AuthStatus;
}

const AuthSessionContext = createContext<AuthSessionState | undefined>(
  undefined
);

const SIGNED_OUT: AuthSessionState = { session: null, status: "signedOut" };

function toState(session: Session | null): AuthSessionState {
  return session ? { session, status: "signedIn" } : SIGNED_OUT;
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthSessionState>({
    session: null,
    status: "checking",
  });

  useEffect(() => {
    const { auth } = getSupabaseClient();
    let mounted = true;

    const apply = (session: Session | null) => {
      if (mounted) {
        setState(toState(session));
      }
    };

    const readStoredSession = async () => {
      const { data, error } = await auth.getSession();

      if (!error) {
        apply(data.session);

        return;
      }

      // An expired refresh token or a stored value that no longer decrypts
      // arrives here. Neither is a signed-in user, and leaving the broken value
      // in place would repeat the failure on every launch, so drop the local
      // session and let the person sign in again.
      apply(null);
      await auth.signOut({ scope: "local" });
    };

    readStoredSession().catch(() => {
      // Whatever went wrong, the stored session is not usable. Signing in again
      // is the recovery either way.
      apply(null);
    });

    const {
      data: { subscription },
    } = auth.onAuthStateChange((_event, session) => {
      apply(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthSessionContext.Provider value={state}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession(): AuthSessionState {
  const state = useContext(AuthSessionContext);

  if (!state) {
    throw new Error(
      "useAuthSession은 AuthSessionProvider 안에서만 쓸 수 있습니다."
    );
  }

  return state;
}
