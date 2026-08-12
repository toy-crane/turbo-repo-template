import { Stack } from "expo-router";

import { useAppTheme } from "@/core/theme/app-theme-bridge";
import { ProfileOnboardingProvider } from "@/features/auth/state/profile-onboarding";

/**
 * The onboarding stack.
 *
 * Both screens show the same native header shell, so their content starts at
 * the same height. The nickname screen is the root and hides the back control;
 * the account id screen uses that control to return to the nickname.
 */
/**
 * Anchors the stack to the first screen, so a restored navigation state that
 * points at the account id still has the nickname beneath it. The draft lives
 * in memory, so reopening the app starts at the nickname either way; this is
 * what keeps the back chevron from having nowhere to go in between.
 */
export const unstable_settings = { anchor: "nickname" };

export default function OnboardingLayout() {
  const { background } = useAppTheme();

  return (
    // Above the stack, so both screens read and write the same two values and
    // going back finds them unchanged.
    <ProfileOnboardingProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: background },
          // The chevron with no label. A label would name the screen behind,
          // which repeats what the heading on this one already says.
          headerBackButtonDisplayMode: "minimal",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: background },
          headerTitle: "",
        }}
      >
        <Stack.Screen name="nickname" options={{ headerBackVisible: false }} />
        <Stack.Screen name="username" />
      </Stack>
    </ProfileOnboardingProvider>
  );
}
