import { router, Stack } from "expo-router";
import { useCallback } from "react";
import { Platform } from "react-native";

import { useAppTheme } from "@/core/theme/app-theme-bridge";
import { chatLabels } from "@/features/chat/ui/chat-labels";
import { ChatScreen } from "@/screens/chat/chat-screen";
import { toolbarIcon } from "@/shared/ui/toolbar-icons";

function goBack() {
  router.back();
}

export default function ChatRoute() {
  const { background } = useAppTheme();
  const openSideChat = useCallback((id: string) => {
    router.push({ params: { id }, pathname: "/chat/side" });
  }, []);

  return (
    <>
      <Stack.Screen
        // Back and the title are the whole header for a pushed conversation:
        // its scroll position lives at the end, where a collapsing large title
        // would never expand. iOS lets messages pass behind a soft scroll edge;
        // Android's app bar keeps the theme background.
        options={{
          headerLargeTitleEnabled: false,
          title: "대화",
          ...(Platform.OS === "ios"
            ? {
                headerShadowVisible: false,
                headerTransparent: true,
                scrollEdgeEffects: { top: "soft" },
              }
            : {
                headerStyle: { backgroundColor: background },
              }),
        }}
      />
      <ChatScreen onOpenSideChat={openSideChat} />
      {/*
        The toolbar replaces the stack's own back button, so this one carries
        the name a screen reader reads.
      */}
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel={chatLabels.back}
          icon={toolbarIcon("back")}
          onPress={goBack}
        />
      </Stack.Toolbar>
    </>
  );
}
