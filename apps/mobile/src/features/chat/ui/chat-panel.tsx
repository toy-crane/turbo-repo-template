import {
  KeyboardAwareLegendList,
  useKeyboardChatComposerInset,
  useKeyboardScrollToEnd,
} from "@legendapp/list/keyboard";
import type { LegendListRef } from "@legendapp/list/react-native";
import type { UIMessage } from "ai";
import { Button } from "heroui-native/button";
import { useThemeColor } from "heroui-native/hooks";
import { Spinner } from "heroui-native/spinner";
import { useCallback, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ChatSession } from "@/features/chat/state/use-chat-session";
import { Icon } from "@/shared/ui/icon/icon";
import { chatLabels } from "./chat-labels";
import { MessageRow } from "./message-row";

// biome-ignore lint/performance/noBarrelFile: the labels moved to their own module and existing consumers keep this import path
export { chatLabels } from "./chat-labels";

/** How tall the composer's text input may grow, in pixels. */
const INPUT_MAX_HEIGHT = 120;

/**
 * How far from the end the reader can drift, as a fraction of the screen,
 * while the list still follows new content.
 */
const FOLLOW_END_THRESHOLD = 0.15;

function renderMessage({ item }: { item: UIMessage }) {
  return <MessageRow message={item} />;
}

function keyOfMessage(message: UIMessage) {
  return message.id;
}

function EmptyConversation() {
  return (
    <View className="flex-1 items-center justify-center gap-2 px-8">
      <Text className="font-semibold text-2xl text-foreground">
        무엇을 도와드릴까요?
      </Text>
      <Text className="text-center text-muted-foreground">
        궁금한 것을 입력하면 AI가 바로 답합니다.
      </Text>
    </View>
  );
}

/**
 * The conversation and the controls that drive it.
 *
 * The screen that assembles this panel owns the chat session, so the panel
 * stays a view over the conversation and the same session can later serve the
 * header's new-conversation control.
 */
export function ChatPanel({ chat }: { chat: ChatSession }) {
  const insets = useSafeAreaInsets();
  const [accentForeground, foreground] = useThemeColor([
    "accent-foreground",
    "foreground",
  ]);

  const listRef = useRef<LegendListRef | null>(null);
  const composerRef = useRef<View | null>(null);
  const { contentInsetEndAdjustment, onComposerLayout } =
    useKeyboardChatComposerInset(listRef, composerRef);
  const { freeze, scrollMessageToEnd } = useKeyboardScrollToEnd({ listRef });

  // Mirrors the list's own end tracking into React state: the scroll-to-latest
  // button exists only while the reader is away from the end.
  const [endVisible, setEndVisible] = useState(true);
  const [composerHeight, setComposerHeight] = useState(0);

  const handleComposerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setComposerHeight(event.nativeEvent.layout.height);
      onComposerLayout(event);
    },
    [onComposerLayout]
  );

  const scrollToLatest = useCallback(() => {
    scrollMessageToEnd({ animated: true, closeKeyboard: false }).catch(
      () => undefined
    );
  }, [scrollMessageToEnd]);

  const hasMessages = chat.messages.length > 0;
  const canSend = chat.draft.trim().length > 0;

  return (
    <View className="flex-1 bg-background">
      {hasMessages ? (
        <KeyboardAwareLegendList
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16 }}
          contentInsetAdjustmentBehavior="automatic"
          contentInsetEndAdjustment={contentInsetEndAdjustment}
          data={chat.messages}
          freeze={freeze}
          keyboardDismissMode="interactive"
          keyboardLiftBehavior="whenAtEnd"
          keyExtractor={keyOfMessage}
          maintainScrollAtEnd
          maintainScrollAtEndThreshold={FOLLOW_END_THRESHOLD}
          maintainVisibleContentPosition
          onEndVisible={setEndVisible}
          ref={listRef}
          renderItem={renderMessage}
          testID="chat-list"
        />
      ) : (
        <EmptyConversation />
      )}

      {endVisible ? null : (
        <View
          className="absolute right-5 items-end"
          style={{ bottom: composerHeight + 12 }}
        >
          <Pressable
            accessibilityLabel={chatLabels.scrollToLatest}
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full bg-surface shadow-sm"
            onPress={scrollToLatest}
            testID="chat-scroll-to-latest"
          >
            <Icon name="scrollToLatest" tintColor={foreground} />
          </Pressable>
        </View>
      )}

      {/*
        Absolutely placed over the list: the list keeps the full screen and
        `contentInsetEndAdjustment` (the measured composer height) is what
        keeps messages clear of it. The sticky view then rides the keyboard.
      */}
      <KeyboardStickyView
        offset={{ closed: 0, opened: insets.bottom }}
        style={{ bottom: 0, left: 0, position: "absolute", right: 0 }}
      >
        <View
          className="gap-2 bg-background px-5 pt-2"
          onLayout={handleComposerLayout}
          ref={composerRef}
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          {chat.isBusy ? (
            <View
              className="flex-row items-center gap-2"
              testID="chat-generating"
            >
              <Spinner size="sm" />
              <Text className="text-muted-foreground text-sm">
                {chatLabels.generating}
              </Text>
            </View>
          ) : null}

          {chat.error ? (
            <View className="gap-2">
              <Text
                accessibilityRole="alert"
                className="text-danger text-sm"
                testID="chat-error"
              >
                답변을 받지 못했습니다. 잠시 뒤에 다시 시도해 주세요.
              </Text>
              <Button
                accessibilityLabel={chatLabels.retry}
                isDisabled={!chat.canRetry}
                onPress={chat.retry}
                variant="tertiary"
              >
                <Button.Label>다시 보내기</Button.Label>
              </Button>
            </View>
          ) : null}

          <View className="flex-row items-end gap-2">
            <TextInput
              accessibilityLabel={chatLabels.input}
              className="flex-1 rounded-2xl bg-surface px-4 py-3 text-base text-surface-foreground"
              multiline
              onChangeText={chat.setDraft}
              placeholder="무엇이든 물어보세요"
              style={{ maxHeight: INPUT_MAX_HEIGHT }}
              testID="chat-input"
              value={chat.draft}
            />
            {chat.isBusy ? (
              <Pressable
                accessibilityLabel={chatLabels.stop}
                accessibilityRole="button"
                className="h-11 w-11 items-center justify-center rounded-full bg-accent"
                onPress={chat.stop}
                testID="chat-stop"
              >
                <Icon name="stop" tintColor={accentForeground} />
              </Pressable>
            ) : (
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
                <Icon name="send" tintColor={accentForeground} />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardStickyView>
    </View>
  );
}
