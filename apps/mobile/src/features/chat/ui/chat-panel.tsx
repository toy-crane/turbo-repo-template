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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  KeyboardStickyView,
  useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller";
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
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

/** Visible space between the composer surface and an open keyboard. */
const KEYBOARD_COMPOSER_GAP = 8;

function keyOfMessage(message: UIMessage) {
  return message.id;
}

function EmptyConversation({
  composerInset,
  keyboardOpenedOffset,
}: {
  composerInset: SharedValue<number>;
  keyboardOpenedOffset: number;
}) {
  const { height, progress } = useReanimatedKeyboardAnimation();
  const centeredInVisibleArea = useAnimatedStyle(() => {
    const keyboardOffset = interpolate(
      progress.value,
      [0, 1],
      [0, keyboardOpenedOffset]
    );

    return {
      transform: [
        {
          translateY: (height.value + keyboardOffset - composerInset.value) / 2,
        },
      ],
    };
  }, [composerInset, height, keyboardOpenedOffset, progress]);

  return (
    <Animated.View
      className="flex-1 items-center justify-center gap-2 px-8"
      style={centeredInVisibleArea}
    >
      <Text className="font-semibold text-2xl text-foreground">
        무엇을 도와드릴까요?
      </Text>
      <Text className="text-center text-muted">
        궁금한 것을 입력하면 AI가 바로 답해요.
      </Text>
    </Animated.View>
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
  const composerBottomInset = Math.max(insets.bottom, 12);
  const keyboardOpenedOffset = composerBottomInset - KEYBOARD_COMPOSER_GAP;
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

  const scrollToLatest = useCallback(() => {
    scrollMessageToEnd({ animated: true, closeKeyboard: false }).catch(
      () => undefined
    );
  }, [scrollMessageToEnd]);

  const canSend = chat.draft.trim().length > 0;

  // `accessibilityRole="alert"` announces nothing in React Native: Android
  // turns it into a role description string and iOS maps it to no trait at
  // all. Generating and failing are the two states a screen reader user has
  // no other way to notice, so the panel says them out loud itself.
  const announced = useRef<string | undefined>(undefined);
  const spoken = chat.error
    ? chatLabels.errorAnnouncement
    : (chat.isBusy && chatLabels.generating) || undefined;

  useEffect(() => {
    if (spoken === announced.current) {
      return;
    }

    announced.current = spoken;

    if (spoken !== undefined) {
      AccessibilityInfo.announceForAccessibility(spoken);
    }
  }, [spoken]);

  // Only the last user message can be rewritten and only the last answer can
  // be regenerated; every earlier message keeps constant props so its
  // memoized row stays quiet.
  const lastUserId = chat.messages.findLast(
    (message) => message.role === "user"
  )?.id;
  const lastAssistantId = chat.messages.findLast(
    (message) => message.role === "assistant"
  )?.id;
  const { isBusy, regenerateLast, startEdit, status } = chat;
  const renderMessage = useCallback(
    ({ item }: { item: UIMessage }) => (
      <MessageRow
        editAction={item.id === lastUserId ? startEdit : undefined}
        editDisabled={item.id === lastUserId ? isBusy : false}
        message={item}
        regenerateAction={
          item.id === lastAssistantId ? regenerateLast : undefined
        }
        regenerateDisabled={
          item.id === lastAssistantId ? status !== "ready" : false
        }
      />
    ),
    [isBusy, lastAssistantId, lastUserId, regenerateLast, startEdit, status]
  );

  // The list refreshes rows only when data or this value changes, so every
  // input that moves an action button between rows has to be in here. Kept
  // memoized so streaming chunks (which change none of these) leave the
  // other rows alone.
  const listExtraData = useMemo(
    () => ({ isBusy, lastAssistantId, lastUserId, status }),
    [isBusy, lastAssistantId, lastUserId, status]
  );
  const renderEmptyConversation = useCallback(
    () => (
      <EmptyConversation
        composerInset={contentInsetEndAdjustment}
        keyboardOpenedOffset={keyboardOpenedOffset}
      />
    ),
    [contentInsetEndAdjustment, keyboardOpenedOffset]
  );

  return (
    <View className="flex-1 bg-background">
      <KeyboardAwareLegendList
        contentContainerStyle={{
          flexGrow: chat.messages.length === 0 ? 1 : undefined,
          paddingHorizontal: 20,
          paddingTop: chat.messages.length === 0 ? 0 : 16,
        }}
        contentInsetEndAdjustment={contentInsetEndAdjustment}
        data={chat.messages}
        extraData={listExtraData}
        freeze={freeze}
        // Interactive tracking exists only on iOS; Android closes the
        // keyboard as soon as the list is dragged.
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardLiftBehavior={
          chat.messages.length === 0 ? "never" : "whenAtEnd"
        }
        // React Native defaults to "never", which spends the first tap on
        // dismissing the keyboard. Every message action lives inside this
        // list, so without this they all need two taps while the composer
        // is open.
        keyboardShouldPersistTaps="handled"
        keyExtractor={keyOfMessage}
        ListEmptyComponent={renderEmptyConversation}
        maintainScrollAtEnd
        maintainScrollAtEndThreshold={FOLLOW_END_THRESHOLD}
        maintainVisibleContentPosition
        onEndVisible={setEndVisible}
        ref={listRef}
        renderItem={renderMessage}
        testID="chat-list"
      />

      {/*
        Absolutely placed over the list: the list keeps the full screen and
        `contentInsetEndAdjustment` (the measured composer height) is what
        keeps messages clear of it. The sticky view then rides the keyboard,
        and the scroll-to-latest button lives inside it so it stays above the
        keyboard and the composer wherever they are.
      */}
      <KeyboardStickyView
        offset={{
          closed: 0,
          opened: keyboardOpenedOffset,
        }}
        style={{ bottom: 0, left: 0, position: "absolute", right: 0 }}
        testID="chat-keyboard-sticky"
      >
        {endVisible ? null : (
          <View className="absolute right-5" style={{ top: -56 }}>
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

        {chat.isBusy ? (
          <View
            accessibilityLiveRegion="polite"
            className="flex-row items-center gap-2 px-5"
            testID="chat-generating"
          >
            <Spinner size="sm" />
            <Text className="text-muted text-sm">{chatLabels.generating}</Text>
          </View>
        ) : null}

        {chat.error ? (
          <View className="gap-2 px-5">
            <Text
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              className="text-danger text-sm"
              testID="chat-error"
            >
              잠시 뒤에 다시 보내 주세요.
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

        <View
          className="gap-2 px-5"
          onLayout={onComposerLayout}
          ref={composerRef}
          style={{ paddingBottom: composerBottomInset, paddingTop: 16 }}
          testID="chat-composer"
        >
          {chat.editing ? (
            <View
              accessibilityLiveRegion="polite"
              className="flex-row items-center justify-between"
              testID="chat-editing"
            >
              <Text className="text-muted text-sm">메시지를 고치는 중</Text>
              <Pressable
                accessibilityLabel={chatLabels.cancelEdit}
                accessibilityRole="button"
                className="min-h-11 justify-center px-2"
                onPress={chat.cancelEdit}
                testID="chat-cancel-edit"
              >
                <Text className="text-link">편집 취소</Text>
              </Pressable>
            </View>
          ) : null}

          <View className="flex-row items-end gap-2">
            <TextInput
              accessibilityLabel={chatLabels.input}
              className="flex-1 rounded-2xl bg-surface px-4 py-3 text-base text-surface-foreground"
              multiline
              onChangeText={chat.setDraft}
              onSubmitEditing={chat.send}
              placeholder="무엇이든 물어보세요"
              returnKeyType="send"
              style={{ maxHeight: INPUT_MAX_HEIGHT }}
              // Multiline is for growing with a long message, not for writing
              // one line at a time: a multiline input defaults to inserting a
              // newline, which leaves a hardware keyboard with no way to send
              // at all. The return key sends, the way it did when this was a
              // single-line field.
              submitBehavior="submit"
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
