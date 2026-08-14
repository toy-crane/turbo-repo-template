import { Stack } from "expo-router";

import {
  getProfileRouteOptions,
  getSettingsRouteOptions,
  getSettingsStackScreenOptions,
} from "@/core/navigation/settings-sheet";
import { useAppTheme } from "@/core/theme/app-theme-bridge";

/**
 * The stack inside the settings sheet.
 *
 * 프로필 is a push rather than another sheet: it works on what the screen behind
 * it is showing, and stacking a second sheet over the first would hide that
 * relationship along with the profile itself.
 */
export default function SettingsLayout() {
  const { background } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        ...getSettingsStackScreenOptions(),
        contentStyle: { backgroundColor: background },
      }}
    >
      <Stack.Screen name="index" options={getSettingsRouteOptions()} />
      <Stack.Screen name="profile" options={getProfileRouteOptions()} />
    </Stack>
  );
}
