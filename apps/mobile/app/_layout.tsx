import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native/provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import {
  AuthSessionProvider,
  useAuthSession,
} from "../src/features/auth/auth-session";
import { SessionCheckingScreen } from "../src/features/auth/session-checking-screen";
import { getSettingsSheetOptions } from "../src/navigation/settings-sheet";
import { AppQueryProvider } from "../src/query/app-query-provider";
import { SupabaseGate } from "../src/supabase/supabase-gate";
import { AppThemeBridge, useAppTheme } from "../src/theme/app-theme-bridge";

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
            <SupabaseGate>
              <AuthSessionProvider>
                <ThemedRootLayout />
              </AuthSessionProvider>
            </SupabaseGate>
          </AppThemeBridge>
        </HeroUINativeProvider>
      </AppQueryProvider>
    </GestureHandlerRootView>
  );
}
