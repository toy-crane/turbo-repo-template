import { router, Stack } from "expo-router";
import { Platform } from "react-native";

import { useAppTheme } from "@/core/theme/app-theme-bridge";
import { SettingsScreen } from "@/screens/settings/settings-screen";

function dismissSettings() {
  router.dismiss();
}

function openProfileEdit() {
  router.push("/settings/profile");
}

function SettingsToolbar() {
  if (Platform.OS === "ios") {
    return (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="설정 닫기"
          icon="xmark"
          onPress={dismissSettings}
        />
      </Stack.Toolbar>
    );
  }

  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        accessibilityLabel="설정 닫기"
        onPress={dismissSettings}
      >
        닫기
      </Stack.Toolbar.Button>
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
        onEditProfile={openProfileEdit}
      />
      <SettingsToolbar />
    </>
  );
}
