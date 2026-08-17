import { router, Stack, useLocalSearchParams } from "expo-router";

import { chatLabels } from "@/features/chat/ui/chat-labels";
import { SideChatScreen } from "@/screens/chat/side-chat-screen";
import { toolbarIcon } from "@/shared/ui/toolbar-icons";

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
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        accessibilityLabel={chatLabels.closeSideChat}
        icon={toolbarIcon("close")}
        onPress={closeSideChat}
      />
    </Stack.Toolbar>
  );
}

export default function SideChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <SideChatScreen id={id} onMissing={closeSideChat} />
      <SideChatToolbar />
    </>
  );
}
