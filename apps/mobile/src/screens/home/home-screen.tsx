import { useHeaderHeight } from "expo-router/react-navigation";
import { Platform } from "react-native";

import { useAuthSession } from "@/features/auth/state/auth-session";
import { useChatSession } from "@/features/chat/state/use-chat-session";
import { ChatPanel } from "@/features/chat/ui/chat-panel";

/**
 * Home is where the chat feature meets the signed-in session.
 *
 * Neither feature knows about the other, so this is the one place that reads
 * the session and hands the chat its access token. Owning the chat session
 * here also lets the header's tools act on the same conversation the panel
 * shows. The header height comes from navigation, which the chat feature does
 * not read on its own.
 */
export function HomeScreen() {
  const { session } = useAuthSession();
  const chat = useChatSession(session?.access_token);
  const headerHeight = useHeaderHeight();

  // Only iOS draws content under a translucent header; Android's app bar
  // already sits above the screen, so an extra inset would double the gap.
  return (
    <ChatPanel
      chat={chat}
      topInset={Platform.OS === "ios" ? headerHeight : 0}
    />
  );
}
