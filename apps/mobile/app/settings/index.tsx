import { router, Stack } from "expo-router";

import { useAppTheme } from "@/core/theme/app-theme-bridge";
import { CLOSE_SETTINGS_LABEL } from "@/features/auth/ui/profile-labels";
import { SettingsScreen } from "@/screens/settings/settings-screen";
import { toolbarIcon } from "@/shared/ui/icon/toolbar-icons";

function dismissSettings() {
  router.dismiss();
}

function openProfileEdit() {
  router.push("/settings/profile");
}

function openAccountDeletion() {
  router.push("/settings/delete-account");
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
  const { danger, foreground, muted } = useAppTheme();

  return (
    <>
      <SettingsScreen
        danger={danger}
        foreground={foreground}
        muted={muted}
        onDeleteAccount={openAccountDeletion}
        onEditProfile={openProfileEdit}
      />
      <SettingsToolbar />
    </>
  );
}
