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
  const { markAsked } = useSideChats();
  const chat = useChat({
    chat: sideChat.chat,
    throttle: STREAM_UPDATE_INTERVAL_MS,
  });
  const drafts = useSideChatDrafts(sideChat.id);
  const session = useConversation(chat, drafts, accessToken);
  const hasMessages = chat.messages.length > 0;

  // The first question is what turns a side chat into one of the conversation's
  // own. Read from the messages rather than from sending, so a question that
  // failed on its way out still counts — it is in the conversation either way.
  useEffect(() => {
    if (hasMessages) {
      markAsked(sideChat.id);
    }
  }, [hasMessages, markAsked, sideChat.id]);

  return session;
}
