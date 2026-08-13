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
        // would never expand. Android's app bar needs the theme background
        // spelled out; iOS keeps its own translucent one.
        options={{
          headerLargeTitleEnabled: false,
          title: "대화",
          ...(Platform.OS === "android" && {
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
