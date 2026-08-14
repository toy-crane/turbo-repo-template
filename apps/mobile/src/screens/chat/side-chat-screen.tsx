import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect } from "react";
import type { TextInput } from "react-native";
import { Platform } from "react-native";

import { useAuthSession } from "@/features/auth/state/auth-session";
import { type SideChat, useSideChats } from "@/features/chat/state/side-chats";
import { useSideChatSession } from "@/features/chat/state/use-side-chat-session";
import { ChatPanel } from "@/features/chat/ui/chat-panel";
import { useFocusOnArrival } from "@/shared/navigation/use-screen-arrival";

function SideChatConversation({ sideChat }: { sideChat: SideChat }) {
  const { session } = useAuthSession();
  const chat = useSideChatSession(sideChat, session?.access_token);
  const headerHeight = useHeaderHeight();
  const inputRef = useFocusOnArrival<TextInput>();

  return (
    <ChatPanel
      chat={chat}
      inputRef={inputRef}
      // No `onAskInSideChat`: an answer here can be selected and copied, but a
      // side chat cannot start another one.
      source={sideChat.phrase}
      // The sheet's header is transparent like the conversation's, so the list
      // reaches under it and this pushes the source back into view.
      topInset={Platform.OS === "ios" ? headerHeight : 0}
    />
  );
}

/**
 * One side chat, for as long as its sheet is open.
 *
 * The conversation itself is not this screen's — it is the parent chat's, and
 * it is still there when the sheet closes. What the screen owns is the way in
 * and the way out: a side chat that never asked anything goes when the sheet
 * does, and a side chat whose source answer left the parent conversation has
 * nothing to show, so the sheet closes itself.
 */
export function SideChatScreen({
  id,
  onMissing,
}: {
  id: string;
  onMissing: () => void;
}) {
  const { chats, discardUnasked } = useSideChats();
  const sideChat = chats.find((chat) => chat.id === id);
  const isMissing = sideChat === undefined;

  useEffect(() => () => discardUnasked(id), [discardUnasked, id]);

  useEffect(() => {
    if (isMissing) {
      onMissing();
    }
  }, [isMissing, onMissing]);

  return sideChat ? <SideChatConversation sideChat={sideChat} /> : null;
}
