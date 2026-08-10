import { Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useCallback } from "react";
import { Alert, Platform } from "react-native";

import { useAuthSession } from "@/features/auth/state/auth-session";
import { useChatSession } from "@/features/chat/state/use-chat-session";
import { chatLabels } from "@/features/chat/ui/chat-labels";
import { ChatPanel } from "@/features/chat/ui/chat-panel";

/**
 * Home is where the chat feature meets the signed-in session.
 *
 * Neither feature knows about the other, so this is the one place that reads
 * the session and hands the chat its access token. Owning the chat session
 * here also lets the header's new-conversation control act on the same
 * conversation the panel shows. The header height comes from navigation,
 * which the chat feature does not read on its own.
 */
export function HomeScreen() {
  const { session } = useAuthSession();
  const chat = useChatSession(session?.access_token);
  const headerHeight = useHeaderHeight();

  const { clearConversation, isBusy, messages } = chat;
  const confirmNewChat = useCallback(() => {
    // Locked while generating; and an empty conversation has nothing to
    // confirm or clear.
    if (isBusy || messages.length === 0) {
      return;
    }

    Alert.alert(
      "새 대화",
      "지금 대화는 복구할 수 없습니다. 새 대화를 시작할까요?",
      [
        { style: "cancel", text: "취소" },
        {
          onPress: clearConversation,
          style: "destructive",
          text: "새 대화 시작",
        },
      ]
    );
  }, [clearConversation, isBusy, messages.length]);

  return (
    <>
      {/*
        Only iOS draws content under a translucent header; Android's app bar
        already sits above the screen, so an extra inset would double the gap.
      */}
      <ChatPanel
        chat={chat}
        topInset={Platform.OS === "ios" ? headerHeight : 0}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel={chatLabels.newChat}
          onPress={confirmNewChat}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar.Icon sf="square.and.pencil" />
          ) : (
            <Stack.Toolbar.Label>새 대화</Stack.Toolbar.Label>
          )}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}
