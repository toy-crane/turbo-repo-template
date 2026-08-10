import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState } from "react-native";

import { getSupabaseClient } from "@/shared/supabase/client";

/**
 * The app's one answer to "is someone signed in?".
 *
 * It also owns the refresh ticker, because the ticker only matters for the
 * session this provider holds: Supabase starts one that never stops on native,
 * so it is paused whenever the app leaves the foreground and started again on
 * the way back.
 *
 * `checking` exists so the first frame shows neither screen. Rendering the
 * sign-in screen while a stored session is still loading would flash it at
 * every returning user, and rendering the app first would show protected
 * screens to someone who turns out to be signed out.
 */
export type AuthStatus =
  | "checking"
  | "misconfigured"
  | "signedIn"
  | "signedOut";

export interface AuthSessionState {
  /** Only set for `misconfigured`, which the sign-in screen cannot recover from. */
  problem?: string;
  session: Session | null;
  status: AuthStatus;
}

const AuthSessionContext = createContext<AuthSessionState | undefined>(
  undefined
);

const SIGNED_OUT: AuthSessionState = { session: null, status: "signedOut" };

/**
 * The error Supabase raises when it could not reach the server, as opposed to
 * one that means the stored session is finished. Matching on the name is how
 * Supabase itself decides whether to keep the session, so this keeps the two
 * decisions from drifting apart.
 */
function isUnreachable(error: { name?: string }): boolean {
  return error.name === "AuthRetryableFetchError";
}

function toState(session: Session | null): AuthSessionState {
  return session ? { session, status: "signedIn" } : SIGNED_OUT;
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthSessionState>({
    session: null,
    status: "checking",
  });

  useEffect(() => {
    let auth: ReturnType<typeof getSupabaseClient>["auth"];

    try {
      ({ auth } = getSupabaseClient());
    } catch (error) {
      // Opening the sign-in screen here would be a lie: no credentials this
      // person types can reach a Supabase that was never configured.
      setState({
        problem: error instanceof Error ? error.message : String(error),
        session: null,
        status: "misconfigured",
      });

      return;
    }

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

      // Either way the app cannot act as this user right now, so it opens the
      // sign-in screen.
      apply(null);

      // But only a session that is actually dead gets thrown away. Supabase
      // raises this one when it could not reach the server to refresh, and it
      // deliberately keeps the refresh token for that case — so does this. The
      // person opened the app offline; their credentials are fine, and auto
      // refresh puts them back in the app once the connection returns without
      // asking for a new code. Signing out here would destroy a working session
      // over a dropped request, and would not even succeed: Supabase returns
      // the same error again before it removes anything.
      if (isUnreachable(error)) {
        return;
      }

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

    auth.startAutoRefresh();

    const appState = AppState.addEventListener("change", (appStatus) => {
      if (appStatus === "active") {
        auth.startAutoRefresh();
      } else {
        auth.stopAutoRefresh();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      appState.remove();
      auth.stopAutoRefresh();
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
