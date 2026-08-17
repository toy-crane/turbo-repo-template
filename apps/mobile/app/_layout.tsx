import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native/provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { useProtectedArea } from "@/core/navigation/protected-area";
import { getSettingsSheetOptions } from "@/core/navigation/settings-sheet";
import { QueryProvider } from "@/core/providers/query-provider";
import { AppThemeBridge, useAppTheme } from "@/core/theme/app-theme-bridge";
import { AuthSessionProvider } from "@/features/auth/state/auth-session";
import { ProfileUnavailableScreen } from "@/screens/session/profile-unavailable-screen";
import { SessionCheckingScreen } from "@/screens/session/session-checking-screen";
import { SetupNeededScreen } from "@/screens/session/setup-needed-screen";

const heroUIConfig = {
  devInfo: { stylingPrinciples: false },
} as const;

function ThemedRootLayout() {
  const { background } = useAppTheme();
  const { area, isRetryingProfile, problem, retryProfile } = useProtectedArea();

  if (area === "checking") {
    return <SessionCheckingScreen />;
  }

  if (area === "misconfigured") {
    return <SetupNeededScreen problem={problem ?? ""} />;
  }

  if (area === "profileUnavailable") {
    return (
      <ProfileUnavailableScreen
        isRetrying={isRetryingProfile}
        onRetry={retryProfile}
      />
    );
  }

  return (
    <>
      {/*
        The guards decide which group exists at all, so there is no screen to
        navigate away from and no redirect to write. Expo Router also drops the
        history of a group whose guard turns false, which is what keeps a signed
        out person from swiping back into a protected screen — and what closes
        onboarding the moment the profile is finished.
      */}
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: background },
          headerShown: false,
        }}
      >
        <Stack.Protected guard={area === "app"}>
          <Stack.Screen name="(tabs)" />
          {/*
            A conversation is pushed here rather than inside the tabs so the
            native push covers the tab bar. Hiding the bar from inside the tab
            navigator leaves its strip on screen on Android, where it swallows
            every touch meant for the composer.

            It brings its own stack, which draws the conversation's header and
            presents a side chat as a sheet over it. Left on, this screen would
            show a second header above that one.
          */}
          <Stack.Screen name="chat" />
          <Stack.Screen name="settings" options={getSettingsSheetOptions()} />
        </Stack.Protected>
        <Stack.Protected guard={area === "onboarding"}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={area === "signedOut"}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/*
        Wraps everything below it, including navigation, because the keyboard
        views inside screens read their position from this provider.
      */}
      <KeyboardProvider>
        <QueryProvider>
          <HeroUINativeProvider config={heroUIConfig}>
            <AppThemeBridge>
              <AuthSessionProvider>
                <ThemedRootLayout />
              </AuthSessionProvider>
            </AppThemeBridge>
          </HeroUINativeProvider>
        </QueryProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
