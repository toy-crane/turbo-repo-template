import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ChatSession } from "@/features/chat/state/use-chat-session";
import { Icon } from "@/shared/ui/icon";
import { chatLabels } from "./chat-labels";

// biome-ignore lint/performance/noBarrelFile: screens and tests share these accessibility names
export { chatLabels } from "./chat-labels";

const INPUT_MAX_HEIGHT = 120;

function textOfMessage(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function PlainTextMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = textOfMessage(message);

  if (!text) {
    return null;
  }

  return (
    <View className={isUser ? "mb-3 items-end" : "mb-3 items-start"}>
      <View
        className={
          isUser ? "max-w-[85%] rounded-2xl bg-accent px-4 py-3" : "w-full"
        }
      >
        <Text
          className={
            isUser
              ? "text-accent-foreground"
              : "text-base text-foreground leading-6"
          }
          selectable
          testID={`chat-message-${message.role}`}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

export function ChatPanel({ chat }: { chat: ChatSession }) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<ScrollView | null>(null);
  const [composerHeight, setComposerHeight] = useState(0);
  const canSend = chat.draft.trim().length > 0 && !chat.isBusy;

  const announcedError = useRef<Error | undefined>(undefined);

  useEffect(() => {
    if (!chat.error) {
      announcedError.current = undefined;
      return;
    }

    if (announcedError.current === chat.error) {
      return;
    }

    announcedError.current = chat.error;
    AccessibilityInfo.announceForAccessibility(chatLabels.errorAnnouncement);
  }, [chat.error]);

  const followLatest = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);
  const measureComposer = useCallback((event: LayoutChangeEvent) => {
    setComposerHeight(event.nativeEvent.layout.height);
  }, []);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: composerHeight + 16,
          paddingHorizontal: 20,
          paddingTop: 16,
        }}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={followLatest}
        ref={listRef}
        testID="chat-list"
      >
        {chat.messages.map((message) => (
          <PlainTextMessage key={message.id} message={message} />
        ))}
      </ScrollView>

      <KeyboardStickyView
        offset={{ closed: 0, opened: insets.bottom }}
        style={{ bottom: 0, left: 0, position: "absolute", right: 0 }}
      >
        <View
          className="gap-2 bg-background px-5 pt-2"
          onLayout={measureComposer}
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          {chat.error ? (
            <Text
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              className="text-danger text-sm"
              testID="chat-error"
            >
              {chatLabels.errorAnnouncement}
            </Text>
          ) : null}

          <View className="flex-row items-end gap-2">
            <TextInput
              accessibilityLabel={chatLabels.input}
              className="flex-1 rounded-2xl bg-surface px-4 py-3 text-base text-surface-foreground"
              multiline
              onChangeText={chat.setDraft}
              onSubmitEditing={chat.send}
              placeholder="메시지를 입력하세요"
              returnKeyType="send"
              style={{ maxHeight: INPUT_MAX_HEIGHT }}
              submitBehavior="submit"
              testID="chat-input"
              value={chat.draft}
            />
            <Pressable
              accessibilityLabel={chatLabels.send}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSend }}
              className={
                canSend
                  ? "h-11 w-11 items-center justify-center rounded-full bg-accent"
                  : "h-11 w-11 items-center justify-center rounded-full bg-accent opacity-40"
              }
              disabled={!canSend}
              onPress={chat.send}
              testID="chat-send"
            >
              <Icon name="send" tone="accentForeground" />
            </Pressable>
          </View>
        </View>
      </KeyboardStickyView>
    </View>
  );
}
