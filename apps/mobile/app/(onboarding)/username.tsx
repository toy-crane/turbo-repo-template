import { Redirect } from "expo-router";

import { checkNickname } from "@/features/auth/state/profile-identity";
import { useProfileOnboarding } from "@/features/auth/state/profile-onboarding";
import { UsernameScreen } from "@/screens/onboarding/username-screen";

export default function UsernameRoute() {
  const { nickname } = useProfileOnboarding();

  // The save sends both values together, so there is nothing to do here
  // without a nickname. Reaching this route with an empty draft means the step
  // before it never ran — a restored navigation state, or the app reopened —
  // so the person starts at the screen that fills it.
  if (checkNickname(nickname) !== undefined) {
    return <Redirect href="/(onboarding)/nickname" />;
  }

  return <UsernameScreen />;
}
