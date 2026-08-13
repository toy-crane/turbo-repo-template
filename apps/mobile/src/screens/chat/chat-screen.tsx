import { useHeaderHeight } from "expo-router/react-navigation";
import type { TextInput } from "react-native";
import { Platform } from "react-native";

import { useAuthSession } from "@/features/auth/state/auth-session";
import { useChatSession } from "@/features/chat/state/use-chat-session";
import { ChatPanel } from "@/features/chat/ui/chat-panel";
import { useFocusOnArrival } from "@/shared/navigation/use-screen-arrival";

/**
 * One conversation, for as long as this screen is on the stack.
 *
 * The screen owns the session rather than the panel: the conversation starts
 * when the person opens this screen and ends when they leave it, so "new
 * conversation" is a push and nothing has to clear state in place. The access
 * token comes from here because a feature does not read another feature's
 * state.
 *
 * Entry focus is timed here for the same reason: the screen knows when its own
 * arrival is over, and the panel only owns which control takes the focus.
 */
export function ChatScreen() {
  const { session } = useAuthSession();
  const chat = useChatSession(session?.access_token);
  const headerHeight = useHeaderHeight();
  const inputRef = useFocusOnArrival<TextInput>();

  return (
    <ChatPanel
      chat={chat}
      inputRef={inputRef}
      topInset={Platform.OS === "ios" ? headerHeight : 0}
    />
  );
}
