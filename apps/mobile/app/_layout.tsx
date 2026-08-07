import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppThemeProvider, useAppTheme } from "../src/theme/app-theme-provider";

function ThemedRootLayout() {
  const { colors } = useAppTheme();

  return (
    <GestureHandlerRootView
      style={{ backgroundColor: colors.background.canvas, flex: 1 }}
    >
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background.canvas },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <ThemedRootLayout />
    </AppThemeProvider>
  );
}
