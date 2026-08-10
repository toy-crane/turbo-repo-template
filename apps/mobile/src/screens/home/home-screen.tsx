import { router, useNavigation } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useThemeColor } from "heroui-native/hooks";
import { useCallback, useLayoutEffect } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";

import { useAuthSession } from "@/features/auth/state/auth-session";
import { useChatSession } from "@/features/chat/state/use-chat-session";
import { chatLabels } from "@/features/chat/ui/chat-labels";
import { ChatPanel } from "@/features/chat/ui/chat-panel";
import { Icon } from "@/shared/ui/icon/icon";
import { ProfileAvatarButton } from "./profile-avatar-button";

function openSettings() {
  router.push("/settings");
}

function NewChatButton({ onPress }: { onPress: () => void }) {
  const foreground = useThemeColor("foreground");

  return (
    <Pressable
      accessibilityLabel={chatLabels.newChat}
      accessibilityRole="button"
      onPress={onPress}
      // Explicit values, not classes: header views live outside the styled
      // screen tree.
      style={{
        alignItems: "center",
        height: 44,
        justifyContent: "center",
        minWidth: 44,
      }}
    >
      {Platform.OS === "ios" ? (
        <Icon name="newChat" size={22} tintColor={foreground} />
      ) : (
        <Text style={{ color: foreground, fontSize: 16 }}>새 대화</Text>
      )}
    </Pressable>
  );
}

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
  const navigation = useNavigation();

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

  // `headerRight` instead of `Stack.Toolbar`: the toolbar hosts its items in
  // Jetpack Compose on Android, and a plain sized pressable in that host
  // crashes Compose's constraint measurement outright.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ alignItems: "center", flexDirection: "row" }}>
          <NewChatButton onPress={confirmNewChat} />
          <ProfileAvatarButton onPress={openSettings} />
        </View>
      ),
    });
  }, [confirmNewChat, navigation]);

  // Only iOS draws content under a translucent header; Android's app bar
  // already sits above the screen, so an extra inset would double the gap.
  return (
    <ChatPanel
      chat={chat}
      topInset={Platform.OS === "ios" ? headerHeight : 0}
    />
  );
}
