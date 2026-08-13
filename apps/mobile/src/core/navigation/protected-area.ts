import { isProfileComplete } from "@/features/auth/api/profile";
import { useProfile } from "@/features/auth/query/profile";
import { useAuthSession } from "@/features/auth/state/auth-session";

/**
 * Which half of the app exists right now.
 *
 * The session alone cannot answer this. Someone can hold a perfectly good
 * session and still have no nickname or account id, and the app screens assume
 * both. So the route groups are chosen from the session and the profile
 * together, in one place, rather than by each screen redirecting after it has
 * already rendered.
 *
 * `checking` covers both reads. Anything shown before they finish is a guess:
 * the sign-in screen would flash at a returning user, the app would appear for
 * someone who turns out to be signed out, and onboarding would appear for
 * someone who finished it long ago.
 */
export type ProtectedArea =
  | "app"
  | "checking"
  | "misconfigured"
  | "onboarding"
  | "profileUnavailable"
  | "signedOut";

export interface ProtectedAreaState {
  area: ProtectedArea;
  /** True while the recovery button reads a failed profile again. */
  isRetryingProfile: boolean;
  /** Only set for `misconfigured`, which no screen can recover from. */
  problem?: string;
  /** Reads the profile again after `profileUnavailable`. */
  retryProfile: () => void;
}

export function useProtectedArea(): ProtectedAreaState {
  const { problem, session, status } = useAuthSession();
  const profile = useProfile(session?.user.id);

  const retryProfile = () => {
    profile.refetch();
  };
  const isRetryingProfile = profile.isFetching;

  if (status === "misconfigured") {
    return { area: "misconfigured", isRetryingProfile, problem, retryProfile };
  }

  if (status === "checking") {
    return { area: "checking", isRetryingProfile, retryProfile };
  }

  if (status === "signedOut") {
    return { area: "signedOut", isRetryingProfile, retryProfile };
  }

  // Held values survive a refetch, so a background re-read after the provider
  // stores its name does not throw the person back to a blank screen.
  if (profile.data) {
    return {
      area: isProfileComplete(profile.data) ? "app" : "onboarding",
      isRetryingProfile,
      retryProfile,
    };
  }

  // A profile that cannot be read is not a signed-out person. Signing them out
  // here would cost them a working session over a dropped request, and would
  // hide the one thing they can act on: trying again.
  if (profile.isError) {
    return { area: "profileUnavailable", isRetryingProfile, retryProfile };
  }

  return { area: "checking", isRetryingProfile, retryProfile };
}
