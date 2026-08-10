import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native/provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { getSettingsSheetOptions } from "@/core/navigation/settings-sheet";
import { AppQueryProvider } from "@/core/providers/app-query-provider";
import { AppThemeBridge, useAppTheme } from "@/core/theme/app-theme-bridge";
import {
  AuthSessionProvider,
  useAuthSession,
} from "@/features/auth/auth-session";
import { SessionCheckingScreen } from "@/features/auth/session-checking-screen";

const heroUIConfig = {
  devInfo: { stylingPrinciples: false },
} as const;

function ThemedRootLayout() {
  const { background } = useAppTheme();
  const { status } = useAuthSession();

  if (status === "checking") {
    return <SessionCheckingScreen />;
  }

  return (
    <>
      {/*
        The guards decide which group exists at all, so there is no screen to
        navigate away from and no redirect to write. Expo Router also drops the
        history of a group whose guard turns false, which is what keeps a signed
        out person from swiping back into a protected screen.
      */}
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: background },
          headerShown: false,
        }}
      >
        <Stack.Protected guard={status === "signedIn"}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" options={getSettingsSheetOptions()} />
        </Stack.Protected>
        <Stack.Protected guard={status === "signedOut"}>
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
      <AppQueryProvider>
        <HeroUINativeProvider config={heroUIConfig}>
          <AppThemeBridge>
            <AuthSessionProvider>
              <ThemedRootLayout />
            </AuthSessionProvider>
          </AppThemeBridge>
        </HeroUINativeProvider>
      </AppQueryProvider>
    </GestureHandlerRootView>
  );
}
