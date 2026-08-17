import { router, Stack } from "expo-router";
import { Platform } from "react-native";

import { chatLabels } from "@/features/chat/ui/chat-labels";
import { HomeScreen } from "@/screens/home/home-screen";
import { ProfileAvatarButton } from "@/screens/home/profile-avatar-button";
import { toolbarIcon } from "@/shared/ui/toolbar-icons";

function openChat() {
  router.push("/chat");
}

function openSettings() {
  router.push("/settings");
}

export default function HomeRoute() {
  return (
    <>
      <HomeScreen />
      {/*
        The new-conversation action sits apart from the profile so it remains
        the leading action on both platforms. Every item is written out here
        rather than wrapped in a component of its own, because the toolbar
        reads its children by element type and drops anything else.
      */}
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel={chatLabels.newChat}
          icon={toolbarIcon("newChat")}
          onPress={openChat}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        {Platform.OS === "ios" ? (
          <Stack.Toolbar.View hidesSharedBackground>
            <ProfileAvatarButton onPress={openSettings} />
          </Stack.Toolbar.View>
        ) : (
          // Android draws the toolbar with Compose, and a React Native view
          // hosted in it has no width of its own: it stretches across the
          // whole bar and pushes out the title and every sibling button.
          <Stack.Toolbar.Button
            accessibilityLabel="Open settings"
            icon={toolbarIcon("profile")}
            onPress={openSettings}
          />
        )}
      </Stack.Toolbar>
    </>
  );
}
