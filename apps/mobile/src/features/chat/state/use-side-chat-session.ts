import { useChat } from "@ai-sdk/react";
import { useEffect } from "react";

import { type SideChat, useSideChatDrafts, useSideChats } from "./side-chats";
import {
  type ChatSession,
  STREAM_UPDATE_INTERVAL_MS,
  useConversation,
} from "./use-chat-session";

/**
 * One side chat, as the same conversation every chat screen shows.
 *
 * The chat instance comes from the store rather than from this hook, so the
 * answer arriving now keeps arriving after the sheet closes and the same
 * messages are there when it opens again.
 */
export function useSideChatSession(
  sideChat: SideChat,
  accessToken: string | undefined
): ChatSession {
  const { markAsked, rememberLastText } = useSideChats();
  const chat = useChat({
    chat: sideChat.chat,
    throttle: STREAM_UPDATE_INTERVAL_MS,
  });
  const drafts = useSideChatDrafts(sideChat.id);
  const session = useConversation(chat, drafts, accessToken);
  const messageCount = chat.messages.length;

  // The first question is what turns a side chat into one of the conversation's
  // own. Read from the messages rather than from sending, so a question that
  // failed on its way out still counts — it is in the conversation either way.
  useEffect(() => {
    if (messageCount > 0) {
      markAsked(sideChat.id);
    }
  }, [markAsked, messageCount, sideChat.id]);

  // Only when a message comes or goes, not on every character: the count above
  // the parent conversation would otherwise be redrawn all through a stream,
  // and the finished answer arrives through the chat's own report anyway.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the count is the trigger; the messages are read from the chat itself
  useEffect(() => {
    rememberLastText(sideChat.id, sideChat.chat.messages);
  }, [messageCount, rememberLastText, sideChat]);

  return session;
}
