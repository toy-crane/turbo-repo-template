import { Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { setBackgroundColorAsync } from "expo-system-ui";
import { useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { getNavigationTheme } from "../src/theme/navigation-theme";
import { getSemanticColors } from "../src/theme/semantic-colors";

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = getSemanticColors(scheme);
  const navigationTheme = useMemo(() => getNavigationTheme(scheme), [scheme]);

  useEffect(() => {
    setBackgroundColorAsync(colors.background.canvas).catch(() => undefined);
  }, [colors.background.canvas]);

  return (
    <GestureHandlerRootView
      style={{ backgroundColor: colors.background.canvas, flex: 1 }}
    >
      <ThemeProvider value={navigationTheme}>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.background.canvas },
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
