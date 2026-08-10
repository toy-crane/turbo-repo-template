import { Stack } from "expo-router";
import { Platform } from "react-native";

import { useAppTheme } from "@/core/theme/app-theme-bridge";

interface TabStackProps {
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

export function getTabStackRouteOptions(title: string) {
  return {
    headerLargeTitleEnabled: true,
    title,
  };
}

export function TabStack({ routeName, title }: TabStackProps) {
  const { background, foreground } = useAppTheme();

  return (
    <Stack screenOptions={getTabStackScreenOptions({ background, foreground })}>
      <Stack.Screen name={routeName} options={getTabStackRouteOptions(title)} />
    </Stack>
  );
}
