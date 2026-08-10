import { Stack } from "expo-router";
import { Platform } from "react-native";

import { useAppTheme } from "@/core/theme/app-theme-bridge";

interface TabStackProps {
  /**
   * Whether the title uses the collapsing iOS Large Title. Chat-style screens
   * pinned to the bottom keep a compact bar instead, because their scroll
   * position lives at the end and a large title would never collapse.
   */
  largeTitle?: boolean;
  routeName: string;
  title: string;
}

type MobilePlatform = "android" | "ios";

export function getTabStackScreenOptions(
  colors: { background: string; foreground: string },
  platform: MobilePlatform = Platform.OS === "ios" ? "ios" : "android"
) {
  return {
    contentStyle: { backgroundColor: colors.background },
    headerLargeTitleStyle: { color: colors.foreground },
    ...(platform === "android" && {
      headerStyle: { backgroundColor: colors.background },
    }),
  };
}

export function getTabStackRouteOptions(title: string, largeTitle = true) {
  return {
    headerLargeTitleEnabled: largeTitle,
    title,
  };
}

export function TabStack({
  largeTitle = true,
  routeName,
  title,
}: TabStackProps) {
  const { background, foreground } = useAppTheme();

  return (
    <Stack screenOptions={getTabStackScreenOptions({ background, foreground })}>
      <Stack.Screen
        name={routeName}
        options={getTabStackRouteOptions(title, largeTitle)}
      />
    </Stack>
  );
}
