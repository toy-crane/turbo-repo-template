import { Stack } from "expo-router";
import { type ColorSchemeName, Platform, useColorScheme } from "react-native";

import { getSemanticColors } from "../theme/semantic-colors";

interface TabStackProps {
  routeName: string;
  title: string;
}

type MobilePlatform = "android" | "ios";

export function getTabStackScreenOptions(
  scheme: ColorSchemeName | null,
  platform: MobilePlatform = Platform.OS === "ios" ? "ios" : "android"
) {
  const colors = getSemanticColors(scheme);

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
  return (
    <Stack screenOptions={getTabStackScreenOptions(useColorScheme())}>
      <Stack.Screen name={routeName} options={getTabStackRouteOptions(title)} />
    </Stack>
  );
}
