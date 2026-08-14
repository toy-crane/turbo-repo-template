import { chatLabels } from "@/features/chat/ui/chat-labels";

/**
 * A side chat is a sheet over the conversation it came from.
 *
 * `pageSheet` rather than `formSheet` or a BottomSheet component: it is a
 * conversation of its own with a keyboard, long messages and no fixed height,
 * and the native stack is what owns the sheet's background, corners, transition
 * and close gesture. The way out is the close button, not a back arrow: the
 * conversation behind it is not a screen this one came from.
 */
export function getSideChatSheetOptions() {
  return {
    headerBackVisible: false,
    presentation: "pageSheet" as const,
    title: chatLabels.sideChat,
  };
}
