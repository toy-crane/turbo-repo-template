import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { Platform } from "react-native";

import { chatLabels } from "@/features/chat/ui/chat-labels";
import { SideChatScreen } from "@/screens/chat/side-chat-screen";

/**
 * Closing is a dismissal rather than a step back: the conversation underneath
 * is not a screen this one came from, and the platform's own sheet gesture
 * does the same thing.
 */
function closeSideChat() {
  if (router.canDismiss()) {
    router.dismiss();
  }
}

function SideChatToolbar() {
  if (Platform.OS === "ios") {
    return (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel={chatLabels.closeSideChat}
          icon="xmark"
          onPress={closeSideChat}
        />
      </Stack.Toolbar>
    );
  }

  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        accessibilityLabel={chatLabels.closeSideChat}
        onPress={closeSideChat}
      >
        닫기
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

export default function SideChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const close = useCallback(() => closeSideChat(), []);

  return (
    <>
      <SideChatScreen id={id} onMissing={close} />
      <SideChatToolbar />
    </>
  );
}
