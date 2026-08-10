import { router, Stack } from "expo-router";
import { Platform } from "react-native";

import { chatLabels } from "@/features/chat/ui/chat-labels";
import { HomeScreen } from "@/screens/home/home-screen";
import { ProfileAvatarButton } from "@/screens/home/profile-avatar-button";
import { toolbarIcon } from "@/shared/ui/icon/toolbar-icons";

function openChat() {
  router.push("/chat");
}

function openSettings() {
  router.push("/settings");
}

/**
 * Android draws the toolbar with Compose, and a React Native view hosted in it
 * has no width of its own: it stretches across the whole bar, pushing out the
 * title and every sibling button, and its unmeasurable width can crash the
 * Compose measure pass. So the profile picture stays on iOS and Android gets a
 * plain icon button to the same place.
 */
function ProfileToolbarItem() {
  if (Platform.OS !== "ios") {
    return (
      <Stack.Toolbar.Button
        accessibilityLabel="Open settings"
        icon={toolbarIcon("profile")}
        onPress={openSettings}
      />
    );
  }

  return (
    <Stack.Toolbar.View hidesSharedBackground>
      <ProfileAvatarButton onPress={openSettings} />
    </Stack.Toolbar.View>
  );
}

export default function HomeRoute() {
  return (
    <>
      <HomeScreen />
      {/*
        One toolbar owns the whole right side: a second one with the same
        placement replaces the first rather than adding to it.
      */}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel={chatLabels.newChat}
          icon={toolbarIcon("newChat")}
          onPress={openChat}
        />
        <ProfileToolbarItem />
      </Stack.Toolbar>
    </>
  );
}
