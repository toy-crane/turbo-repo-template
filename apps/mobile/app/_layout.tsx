import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native/provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { getSettingsSheetOptions } from "../src/navigation/settings-sheet";
import { AppThemeBridge, useAppTheme } from "../src/theme/app-theme-bridge";

const heroUIConfig = {
  devInfo: { stylingPrinciples: false },
} as const;

function ThemedRootLayout() {
  const { background } = useAppTheme();

  return (
    <>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={getSettingsSheetOptions()} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider config={heroUIConfig}>
        <AppThemeBridge>
          <ThemedRootLayout />
        </AppThemeBridge>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
