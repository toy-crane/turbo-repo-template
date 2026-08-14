import { useHeaderHeight } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo } from "react";
import type { TextInput } from "react-native";
import { Platform } from "react-native";

import { useAuthSession } from "@/features/auth/state/auth-session";
import { useSideChats } from "@/features/chat/state/side-chats";
import { useChatSession } from "@/features/chat/state/use-chat-session";
import type {
  AskInSideChat,
  SideChatEntry,
} from "@/features/chat/ui/chat-panel";
import { ChatPanel } from "@/features/chat/ui/chat-panel";
import { plainLine } from "@/features/chat/ui/plain-line";
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
 *
 * Side chats are the conversation's, not the panel's: this screen is what
 * knows which answer a phrase came from and how much of the conversation the
 * side chat should carry.
 */
export function ChatScreen({
  onOpenSideChat,
}: {
  onOpenSideChat: (id: string) => void;
}) {
  const { session } = useAuthSession();
  const chat = useChatSession(session?.access_token);
  const { askedChats, dropChatsWithoutSource, startSideChat } = useSideChats();
  const headerHeight = useHeaderHeight();
  const inputRef = useFocusOnArrival<TextInput>();
  const { messages } = chat;

  // An answer that was regenerated, or that an edit above it took away, is no
  // longer in the conversation a side chat was reading. Nothing can reach that
  // side chat any more, so it goes with the answer it came from.
  useEffect(() => {
    dropChatsWithoutSource(messages);
  }, [dropChatsWithoutSource, messages]);

  const askInSideChat = useCallback(
    ({ messageId, phrase }: AskInSideChat) => {
      const sourceIndex = messages.findIndex(
        (message) => message.id === messageId
      );

      if (sourceIndex < 0) {
        return;
      }

      onOpenSideChat(
        startSideChat({
          phrase,
          // The conversation up to and including the answer the phrase is in,
          // as it reads now. The side chat reads it and never writes it back.
          snapshot: messages.slice(0, sourceIndex + 1),
          sourceMessageId: messageId,
        })
      );
    },
    [messages, onOpenSideChat, startSideChat]
  );
  const sideChats = useMemo<SideChatEntry[]>(
    () =>
      askedChats.map((sideChat) => ({
        id: sideChat.id,
        lastLine: plainLine(sideChat.lastText),
        phrase: sideChat.phrase,
      })),
    [askedChats]
  );

  return (
    <ChatPanel
      chat={chat}
      inputRef={inputRef}
      onAskInSideChat={askInSideChat}
      onOpenSideChat={onOpenSideChat}
      sideChats={sideChats}
      topInset={Platform.OS === "ios" ? headerHeight : 0}
    />
  );
}
