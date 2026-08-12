import { router, Stack } from "expo-router";
import { Platform } from "react-native";

import { useAppTheme } from "@/core/theme/app-theme-bridge";
import { chatLabels } from "@/features/chat/ui/chat-labels";
import { ChatScreen } from "@/screens/chat/chat-screen";
import { toolbarIcon } from "@/shared/ui/icon/toolbar-icons";

function goBack() {
  router.back();
}

export default function ChatRoute() {
  const { background } = useAppTheme();

  return (
    <>
      <Stack.Screen
        // Back and the title are the whole header for a pushed conversation:
        // its scroll position lives at the end, where a collapsing large title
        // would never expand. iOS uses a clear scroll-edge appearance and adds
        // system material after scrolling; Android keeps the theme background.
        options={{
          headerLargeTitleEnabled: false,
          title: "대화",
          ...(Platform.OS === "ios"
            ? {
                headerBlurEffect: "systemMaterial",
                headerLargeStyle: { backgroundColor: "transparent" },
                headerLargeTitleShadowVisible: false,
                headerShadowVisible: false,
                headerTransparent: true,
                scrollEdgeEffects: {
                  bottom: "hidden",
                  left: "hidden",
                  right: "hidden",
                  top: "hidden",
                },
              }
            : {
                headerStyle: { backgroundColor: background },
              }),
        }}
      />
      <ChatScreen />
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
