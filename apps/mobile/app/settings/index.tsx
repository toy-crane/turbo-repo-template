import { router, Stack } from "expo-router";

import { useAppTheme } from "@/core/theme/app-theme-bridge";
import { CLOSE_SETTINGS_LABEL } from "@/features/auth/ui/profile-labels";
import { SettingsScreen } from "@/screens/settings/settings-screen";
import { toolbarIcon } from "@/shared/ui/toolbar-icons";

function dismissSettings() {
  router.dismiss();
}

function openProfile() {
  router.push("/settings/profile");
}

function SettingsToolbar() {
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        accessibilityLabel={CLOSE_SETTINGS_LABEL}
        icon={toolbarIcon("close")}
        onPress={dismissSettings}
      />
    </Stack.Toolbar>
  );
}

export default function SettingsRoute() {
  const { danger, muted } = useAppTheme();

  return (
    <>
      <SettingsScreen
        danger={danger}
        muted={muted}
        onOpenProfile={openProfile}
      />
      <SettingsToolbar />
    </>
  );
}
