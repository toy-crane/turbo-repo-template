import { Platform } from "react-native";

import { chatLabels } from "@/features/chat/ui/chat-labels";

/**
 * A side chat is a sheet over the conversation it came from.
 *
 * `pageSheet` rather than `formSheet` or a BottomSheet component: it is a
 * conversation of its own with a keyboard, long messages and no fixed height,
 * and the native stack is what owns the sheet's background, corners, transition
 * and close gesture. The way out is the close button, not a back arrow: the
 * conversation behind it is not a screen this one came from.
 *
 * The header is the conversation's own header again: messages pass behind a
 * soft scroll edge on iOS, and Android keeps the theme background. A side chat
 * reads and scrolls like the chat it came from, so it should not meet its
 * header differently.
 */
export function getSideChatSheetOptions(background: string) {
  return {
    headerBackVisible: false,
    presentation: "pageSheet" as const,
    title: chatLabels.sideChat,
    ...(Platform.OS === "ios"
      ? {
          headerShadowVisible: false,
          headerTransparent: true,
          scrollEdgeEffects: { top: "soft" as const },
        }
      : {
          headerShadowVisible: false,
          headerStyle: { backgroundColor: background },
        }),
  };
}
