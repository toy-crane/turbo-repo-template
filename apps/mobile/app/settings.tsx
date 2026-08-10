import { router, Stack } from "expo-router";
import { Platform } from "react-native";

import { useAppTheme } from "@/core/theme/app-theme-bridge";
import { SettingsScreen } from "@/screens/settings/settings-screen";

function dismissSettings() {
  router.dismiss();
}

function SettingsToolbar() {
  if (Platform.OS === "ios") {
    return (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Close settings"
          icon="xmark"
          onPress={dismissSettings}
        />
      </Stack.Toolbar>
    );
  }

  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        accessibilityLabel="Close settings"
        onPress={dismissSettings}
      >
        Close
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

export default function SettingsRoute() {
  const { foreground } = useAppTheme();

  return (
    <>
      <SettingsScreen foreground={foreground} />
      <SettingsToolbar />
    </>
  );
}
