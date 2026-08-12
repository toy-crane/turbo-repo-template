import {
  KeyboardAwareLegendList,
  useKeyboardChatComposerInset,
  useKeyboardScrollToEnd,
} from "@legendapp/list/keyboard";
import type {
  LegendListRef,
  LegendListRenderItemProps,
} from "@legendapp/list/react-native";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
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
const USER_SCROLL_THRESHOLD = 24;
const LIST_END_THRESHOLD = 20;

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

function messageKey(message: UIMessage) {
  return message.id;
}

function renderMessage({ item }: LegendListRenderItemProps<UIMessage>) {
  return <PlainTextMessage message={item} />;
}

export function ChatPanel({ chat }: { chat: ChatSession }) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<LegendListRef | null>(null);
  const composerRef = useRef<View | null>(null);
  const [anchorIndex, setAnchorIndex] = useState<number | undefined>();
  const [isFollowingLatest, setIsFollowingLatest] = useState(true);
  const userMomentum = useRef<true | undefined>(undefined);
  const userScrollStart = useRef<number | undefined>(undefined);
  const canSend = chat.draft.trim().length > 0 && !chat.isBusy;
  const { contentInsetEndAdjustment, onComposerLayout } =
    useKeyboardChatComposerInset(listRef, composerRef);
  const { freeze, scrollMessageToEnd } = useKeyboardScrollToEnd({ listRef });

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

  const beginUserScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      userMomentum.current = undefined;
      userScrollStart.current = event.nativeEvent.contentOffset.y;
    },
    []
  );
  const endUserScroll = useCallback(() => {
    userMomentum.current = undefined;
    userScrollStart.current = undefined;
  }, []);
  const endUserDrag = useCallback(() => {
    requestAnimationFrame(() => {
      if (userMomentum.current === undefined) {
        endUserScroll();
      }
    });
  }, [endUserScroll]);
  const beginUserMomentum = useCallback(() => {
    if (userScrollStart.current !== undefined) {
      userMomentum.current = true;
    }
  }, []);
  const updateScrollPosition = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const startOffset = userScrollStart.current;
      if (startOffset === undefined) {
        return;
      }

      const { contentInset, contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const distanceFromEnd =
        contentSize.height +
        (contentInset?.bottom ?? 0) -
        (contentOffset.y + layoutMeasurement.height);

      if (distanceFromEnd <= LIST_END_THRESHOLD) {
        setIsFollowingLatest(true);
        return;
      }

      if (startOffset - contentOffset.y >= USER_SCROLL_THRESHOLD) {
        setIsFollowingLatest(false);
      }
    },
    []
  );
  const moveToLatest = useCallback(() => {
    setIsFollowingLatest(true);
    scrollMessageToEnd({ animated: true, closeKeyboard: false }).catch(
      () => undefined
    );
  }, [scrollMessageToEnd]);
  const send = useCallback(() => {
    if (!canSend) {
      return;
    }

    setAnchorIndex(chat.messages.length);
    setIsFollowingLatest(true);
    chat.send();

    requestAnimationFrame(() => {
      scrollMessageToEnd({ animated: true, closeKeyboard: true }).catch(
        () => undefined
      );
    });
  }, [canSend, chat, scrollMessageToEnd]);

  return (
    <View className="flex-1 bg-background">
      <KeyboardAwareLegendList
        anchoredEndSpace={
          anchorIndex === undefined ? undefined : { anchorIndex }
        }
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
        }}
        contentInsetEndAdjustment={contentInsetEndAdjustment}
        data={chat.messages}
        freeze={freeze}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardLiftBehavior="whenAtEnd"
        keyboardOffset={insets.bottom}
        keyboardShouldPersistTaps="handled"
        keyExtractor={messageKey}
        maintainScrollAtEnd={
          isFollowingLatest
            ? {
                animated: false,
                on: { dataChange: true, itemLayout: true },
              }
            : false
        }
        maintainScrollAtEndThreshold={0.05}
        maintainVisibleContentPosition={{ data: false, size: true }}
        onMomentumScrollBegin={beginUserMomentum}
        onMomentumScrollEnd={endUserScroll}
        onScroll={updateScrollPosition}
        onScrollBeginDrag={beginUserScroll}
        onScrollEndDrag={endUserDrag}
        recycleItems={false}
        ref={listRef}
        renderItem={renderMessage}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        testID="chat-list"
      />

      <KeyboardStickyView
        offset={{ closed: 0, opened: insets.bottom }}
        style={{ bottom: 0, left: 0, position: "absolute", right: 0 }}
      >
        <View
          className="gap-2 bg-background px-5 pt-2"
          onLayout={onComposerLayout}
          ref={composerRef}
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          {isFollowingLatest ? null : (
            <View className="items-center pb-2">
              <Pressable
                accessibilityLabel={chatLabels.latest}
                accessibilityRole="button"
                className="h-11 w-11 items-center justify-center rounded-full bg-surface"
                onPress={moveToLatest}
                testID="chat-latest"
              >
                <Icon name="latest" size="lg" />
              </Pressable>
            </View>
          )}

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
              onSubmitEditing={send}
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
              onPress={send}
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
