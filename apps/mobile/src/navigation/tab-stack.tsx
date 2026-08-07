import { Stack } from "expo-router";
import { Platform } from "react-native";

import { useAppTheme } from "../theme/app-theme-provider";
import type { SemanticColors } from "../theme/semantic-colors";

interface TabStackProps {
  routeName: string;
  title: string;
}

type MobilePlatform = "android" | "ios";

export function getTabStackScreenOptions(
  colors: SemanticColors,
  platform: MobilePlatform = Platform.OS === "ios" ? "ios" : "android"
) {
  return {
    contentStyle: { backgroundColor: colors.background.canvas },
    headerLargeTitleStyle: { color: colors.text.primary },
    ...(platform === "android" && {
      headerStyle: { backgroundColor: colors.background.canvas },
    }),
  };
}

export function getTabStackRouteOptions(title: string) {
  return {
    headerLargeTitleEnabled: true,
    title,
  };
}

export function TabStack({ routeName, title }: TabStackProps) {
  const { colors } = useAppTheme();

  return (
    <Stack screenOptions={getTabStackScreenOptions(colors)}>
      <Stack.Screen name={routeName} options={getTabStackRouteOptions(title)} />
    </Stack>
  );
}
