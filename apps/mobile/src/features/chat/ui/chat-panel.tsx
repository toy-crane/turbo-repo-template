import {
  KeyboardAwareLegendList,
  useKeyboardChatComposerInset,
  useKeyboardScrollToEnd,
} from "@legendapp/list/keyboard";
import type { LegendListRef } from "@legendapp/list/react-native";
import type { UIMessage } from "ai";
import { useThemeColor } from "heroui-native/hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  type LayoutChangeEvent,
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
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ChatSession } from "@/features/chat/state/use-chat-session";
import { Icon } from "@/shared/ui/icon/icon";
import { chatLabels } from "./chat-labels";
import { AssistantError, MessageRow } from "./message-row";

// biome-ignore lint/performance/noBarrelFile: the labels moved to their own module and existing consumers keep this import path
export { chatLabels } from "./chat-labels";

/** How tall the composer's text input may grow, in pixels. */
const INPUT_MAX_HEIGHT = 120;

/**
 * How far from the end the reader can drift, as a fraction of the screen,
 * while the list still follows new content.
 */
const FOLLOW_END_THRESHOLD = 0.15;

/** Keeps chasing a moving stream after an explicit latest-message request. */
const RESUME_FOLLOW_END_THRESHOLD = Number.POSITIVE_INFINITY;

/** Pause between state-aware jumps while the streamed end is still moving. */
const RESUME_FOLLOW_INTERVAL_MS = 1000;

/** Visible space between the composer surface and an open keyboard. */
const KEYBOARD_COMPOSER_GAP = 8;

/** Space above the input surface reserved for message content. */
const COMPOSER_TOP_PADDING = 16;

/** The latest user row sits this far below the native header. */
const LATEST_USER_TOP_OFFSET = 16;

/** Size of the floating latest-message control. */
const SCROLL_TO_LATEST_SIZE = 44;

/** Visible space between that control and the input surface. */
const SCROLL_TO_LATEST_GAP = 12;

/** One full waiting pulse, in milliseconds. */
const WAITING_PULSE_DURATION_MS = 1000;

interface AssistantPlaceholder {
  id: string;
  kind: "assistant-placeholder";
}

type ChatListItem = AssistantPlaceholder | UIMessage;

function isAssistantPlaceholder(
  item: ChatListItem
): item is AssistantPlaceholder {
  return "kind" in item && item.kind === "assistant-placeholder";
}

function hasVisibleContent(message: UIMessage): boolean {
  return message.parts.some(
    (part) =>
      part.type !== "step-start" &&
      (part.type !== "text" || part.text.length > 0)
  );
}

function WaitingDot() {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    const halfPulse = WAITING_PULSE_DURATION_MS / 2;

    pulse.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: halfPulse,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: halfPulse,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1
    );

    return () => cancelAnimation(pulse);
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(pulse.value, [0, 1], [0.55, 1]);

    return reduceMotion
      ? { opacity }
      : {
          opacity,
          transform: [{ scale: interpolate(pulse.value, [0, 1], [0.82, 1]) }],
        };
  }, [pulse, reduceMotion]);

  return (
    <View
      accessibilityElementsHidden
      accessible={false}
      className="h-6 w-6 items-center justify-center"
      importantForAccessibility="no-hide-descendants"
      style={{ height: 24, width: 24 }}
      testID="chat-waiting-dot-slot"
    >
      <Animated.View
        className="rounded-full bg-accent"
        style={[{ height: 12, width: 12 }, animatedStyle]}
        testID="chat-waiting-dot"
      />
    </View>
  );
}

function AssistantStateRow({
  canRetry,
  failed,
  minimumHeight,
  retry,
}: {
  canRetry: boolean;
  failed: boolean;
  minimumHeight: number;
  retry: () => void;
}) {
  return (
    <View
      className="mb-3 items-start"
      style={{ minHeight: minimumHeight }}
      testID={failed ? "chat-answer-error" : "chat-generating"}
    >
      {failed ? (
        <AssistantError disabled={!canRetry} retryAction={retry} />
      ) : (
        <WaitingDot />
      )}
    </View>
  );
}

function ScrollToLatestButton({
  foreground,
  onPress,
}: {
  foreground: string;
  onPress: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const entering = reduceMotion ? FadeIn.duration(140) : ZoomIn.duration(160);
  const exiting = reduceMotion ? FadeOut.duration(120) : ZoomOut.duration(140);

  return (
    <Animated.View
      className="items-center"
      entering={entering}
      exiting={exiting}
      pointerEvents="box-none"
      style={{
        height: SCROLL_TO_LATEST_SIZE + SCROLL_TO_LATEST_GAP,
      }}
      testID="chat-scroll-to-latest-container"
    >
      <Pressable
        accessibilityLabel={chatLabels.scrollToLatest}
        accessibilityRole="button"
        className="h-11 w-11 items-center justify-center rounded-full bg-surface shadow-sm"
        onPress={onPress}
        testID="chat-scroll-to-latest"
      >
        <Icon name="scrollToLatest" tintColor={foreground} />
      </Pressable>
    </Animated.View>
  );
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

function ChatListRow({
  cancelEdit,
  canRetry,
  confirmEdit,
  editing,
  error,
  handleLatestUserLayout,
  isBusy,
  item,
  lastAssistantId,
  lastUserId,
  latestAnswerId,
  minimumAnswerHeight,
  regenerateLast,
  retry,
  setEditDraft,
  showAnswerState,
  startEdit,
  status,
}: {
  cancelEdit: ChatSession["cancelEdit"];
  canRetry: boolean;
  confirmEdit: ChatSession["confirmEdit"];
  editing: ChatSession["editing"];
  error: Error | undefined;
  handleLatestUserLayout: (event: LayoutChangeEvent) => void;
  isBusy: boolean;
  item: ChatListItem;
  lastAssistantId: string | undefined;
  lastUserId: string | undefined;
  latestAnswerId: string | undefined;
  minimumAnswerHeight: number;
  regenerateLast: () => void;
  retry: () => void;
  setEditDraft: ChatSession["setEditDraft"];
  showAnswerState: boolean;
  startEdit: ChatSession["startEdit"];
  status: ChatSession["status"];
}) {
  if (isAssistantPlaceholder(item)) {
    return (
      <AssistantStateRow
        canRetry={canRetry}
        failed={Boolean(error)}
        minimumHeight={minimumAnswerHeight}
        retry={retry}
      />
    );
  }

  const isLatestAnswer = item.id === latestAnswerId;

  if (isLatestAnswer && showAnswerState) {
    return (
      <AssistantStateRow
        canRetry={canRetry}
        failed={Boolean(error)}
        minimumHeight={minimumAnswerHeight}
        retry={retry}
      />
    );
  }

  return (
    <MessageRow
      cancelEdit={cancelEdit}
      confirmEdit={confirmEdit}
      editDisabled={isBusy || editing !== undefined}
      editing={editing?.messageId === item.id ? editing : undefined}
      errorAction={isLatestAnswer && error ? retry : undefined}
      errorDisabled={!canRetry}
      isStreaming={isLatestAnswer && isBusy}
      message={item}
      minimumHeight={isLatestAnswer ? minimumAnswerHeight : undefined}
      onLayout={item.id === lastUserId ? handleLatestUserLayout : undefined}
      regenerateAction={
        item.id === lastAssistantId ? regenerateLast : undefined
      }
      regenerateDisabled={
        item.id === lastAssistantId
          ? status !== "ready" || editing !== undefined
          : false
      }
      setEditDraft={setEditDraft}
      startEdit={startEdit}
      testID={item.id === lastUserId ? "chat-latest-user-row" : undefined}
    />
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
  const composerInputRef = useRef<TextInput | null>(null);
  const focusComposerAfterEdit = useRef(false);
  const { contentInsetEndAdjustment, onComposerLayout } =
    useKeyboardChatComposerInset(listRef, composerRef);
  const { freeze } = useKeyboardScrollToEnd({ listRef });

  // Mirrors the list's own end tracking into React state: the scroll-to-latest
  // button exists only while the reader is away from the end.
  const [endVisible, setEndVisible] = useState(true);
  const [resumingEndFollow, setResumingEndFollow] = useState(false);
  const [resumeFollowRequest, setResumeFollowRequest] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(0);
  const [latestUserLayout, setLatestUserLayout] = useState<{
    height: number;
    messageId: string;
  }>();
  const [anchoredUserId, setAnchoredUserId] = useState<string | undefined>();
  const anchoringUserId = useRef<string | undefined>(undefined);

  const scrollToLatest = useCallback(() => {
    setEndVisible(true);
    setResumingEndFollow(true);
    setResumeFollowRequest((request) => request + 1);
  }, []);

  useEffect(() => {
    if (!resumingEndFollow || resumeFollowRequest < 1) {
      return;
    }

    // `scrollToEnd` first waits for a stable final row. The answer row keeps
    // changing while text streams, and that row can be taller than the whole
    // viewport. Use the list's measured end offset and refresh it until the
    // list reports the visible end.
    const follow = (animated: boolean) => {
      const list = listRef.current;

      // biome-ignore lint/suspicious/noUnnecessaryConditions: TypeScript correctly keeps a nullable native ref here
      if (!list) {
        setResumingEndFollow(false);
        return;
      }

      const state = list.getState();

      if (state.data.length === 0) {
        setResumingEndFollow(false);
        return;
      }

      list
        .scrollToOffset({
          animated,
          offset: Math.max(0, state.contentLength - state.scrollLength),
        })
        .catch(() => setResumingEndFollow(false));
    };

    follow(true);
    const followInterval = setInterval(
      () => follow(false),
      RESUME_FOLLOW_INTERVAL_MS
    );

    return () => clearInterval(followInterval);
  }, [resumingEndFollow, resumeFollowRequest]);

  const setIsAtEnd = useCallback((visible: boolean) => {
    setEndVisible(visible);

    if (visible) {
      setResumingEndFollow(false);
    }
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    setEndVisible(false);
    setResumingEndFollow(false);
  }, []);
  const handleEndReached = useCallback(() => setIsAtEnd(true), [setIsAtEnd]);

  const { canSend } = chat;

  const confirmEdit = useCallback(() => {
    focusComposerAfterEdit.current = true;
    chat.confirmEdit();
  }, [chat.confirmEdit]);

  useEffect(() => {
    if (chat.editing || !focusComposerAfterEdit.current) {
      return;
    }

    focusComposerAfterEdit.current = false;
    requestAnimationFrame(() => composerInputRef.current?.focus());
  }, [chat.editing]);

  const handleListLayout = useCallback((event: LayoutChangeEvent) => {
    setListHeight(event.nativeEvent.layout.height);
  }, []);

  const handleComposerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onComposerLayout(event);
      setComposerHeight(event.nativeEvent.layout.height);
    },
    [onComposerLayout]
  );

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

  // The last user row still owns the scroll anchor. Every user message may be
  // edited, while only the last answer may be regenerated.
  const lastUserIndex = chat.messages.findLastIndex(
    (message) => message.role === "user"
  );
  const lastUserId = chat.messages[lastUserIndex]?.id;
  const lastAssistantId = chat.messages.findLast(
    (message) => message.role === "assistant"
  )?.id;
  const latestUserHeight =
    latestUserLayout && latestUserLayout.messageId === lastUserId
      ? latestUserLayout.height
      : 0;
  const {
    cancelEdit,
    editing,
    isBusy,
    regenerateLast,
    setEditDraft,
    startEdit,
    status,
  } = chat;

  const latestAnswer = chat.messages.find(
    (message, index) => index > lastUserIndex && message.role === "assistant"
  );
  const latestAnswerHasContent = latestAnswer
    ? hasVisibleContent(latestAnswer)
    : false;
  const showAnswerState = Boolean(
    lastUserId && (chat.isBusy || chat.error) && !latestAnswerHasContent
  );
  const placeholder = useMemo<AssistantPlaceholder | undefined>(
    () =>
      showAnswerState && !latestAnswer && lastUserId
        ? {
            id: `answer-${lastUserId}`,
            kind: "assistant-placeholder",
          }
        : undefined,
    [lastUserId, latestAnswer, showAnswerState]
  );
  const listItems = useMemo<ChatListItem[]>(
    () => (placeholder ? [...chat.messages, placeholder] : chat.messages),
    [chat.messages, placeholder]
  );
  const answerKeyByMessageId = useMemo(() => {
    const keys = new Map<string, string>();
    let questionId: string | undefined;

    for (const message of chat.messages) {
      if (message.role === "user") {
        questionId = message.id;
      } else if (message.role === "assistant" && questionId) {
        keys.set(message.id, `answer-${questionId}`);
      }
    }

    return keys;
  }, [chat.messages]);
  const keyOfItem = useCallback(
    (item: ChatListItem) => {
      if (isAssistantPlaceholder(item)) {
        return item.id;
      }

      return answerKeyByMessageId.get(item.id) ?? item.id;
    },
    [answerKeyByMessageId]
  );
  const minimumAnswerHeight = Math.max(
    0,
    listHeight - composerHeight - latestUserHeight - LATEST_USER_TOP_OFFSET
  );
  const handleLatestUserLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!lastUserId) {
        return;
      }

      setLatestUserLayout({
        height: event.nativeEvent.layout.height,
        messageId: lastUserId,
      });
    },
    [lastUserId]
  );

  useEffect(() => {
    if (
      !lastUserId ||
      lastUserIndex < 0 ||
      latestUserHeight <= 0 ||
      minimumAnswerHeight <= 0 ||
      anchoredUserId === lastUserId ||
      anchoringUserId.current === lastUserId
    ) {
      return;
    }

    // Wait until the answer reserve has its final height. Anchoring before
    // that row grows lets maintainScrollAtEnd pull the question above the
    // header again as soon as the reserve appears.
    anchoringUserId.current = lastUserId;
    listRef.current
      ?.scrollToIndex({
        animated: true,
        index: lastUserIndex,
        viewOffset: LATEST_USER_TOP_OFFSET,
        viewPosition: 0,
      })
      ?.then(() => setAnchoredUserId(lastUserId))
      .catch(() => undefined)
      .finally(() => {
        if (anchoringUserId.current === lastUserId) {
          anchoringUserId.current = undefined;
        }
      });
  }, [
    anchoredUserId,
    lastUserId,
    lastUserIndex,
    latestUserHeight,
    minimumAnswerHeight,
  ]);

  const renderMessage = useCallback(
    ({ item }: { item: ChatListItem }) => (
      <ChatListRow
        cancelEdit={cancelEdit}
        canRetry={chat.canRetry}
        confirmEdit={confirmEdit}
        editing={editing}
        error={chat.error}
        handleLatestUserLayout={handleLatestUserLayout}
        isBusy={isBusy}
        item={item}
        lastAssistantId={lastAssistantId}
        lastUserId={lastUserId}
        latestAnswerId={latestAnswer?.id}
        minimumAnswerHeight={minimumAnswerHeight}
        regenerateLast={regenerateLast}
        retry={chat.retry}
        setEditDraft={setEditDraft}
        showAnswerState={showAnswerState}
        startEdit={startEdit}
        status={status}
      />
    ),
    [
      chat.canRetry,
      cancelEdit,
      chat.error,
      chat.retry,
      confirmEdit,
      editing,
      handleLatestUserLayout,
      isBusy,
      lastAssistantId,
      lastUserId,
      latestAnswer?.id,
      minimumAnswerHeight,
      regenerateLast,
      setEditDraft,
      showAnswerState,
      startEdit,
      status,
    ]
  );

  // The list refreshes rows only when data or this value changes, so every
  // input that moves an action button between rows has to be in here. Kept
  // memoized so streaming chunks (which change none of these) leave the
  // other rows alone.
  const listExtraData = useMemo(
    () => ({
      canRetry: chat.canRetry,
      editing,
      hasError: Boolean(chat.error),
      isBusy,
      lastAssistantId,
      lastUserId,
      latestAnswerId: latestAnswer?.id,
      minimumAnswerHeight,
      showAnswerState,
      status,
    }),
    [
      chat.canRetry,
      chat.error,
      editing,
      isBusy,
      lastAssistantId,
      lastUserId,
      latestAnswer?.id,
      minimumAnswerHeight,
      showAnswerState,
      status,
    ]
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
        data={listItems}
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
        keyExtractor={keyOfItem}
        ListEmptyComponent={renderEmptyConversation}
        maintainScrollAtEnd={
          lastUserId === undefined || anchoredUserId === lastUserId
        }
        maintainScrollAtEndThreshold={
          resumingEndFollow ? RESUME_FOLLOW_END_THRESHOLD : FOLLOW_END_THRESHOLD
        }
        maintainVisibleContentPosition={!resumingEndFollow}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.01}
        onLayout={handleListLayout}
        onScrollBeginDrag={handleScrollBeginDrag}
        ref={listRef}
        renderItem={renderMessage}
        scrollEventThrottle={50}
        testID="chat-list"
      />

      {/*
        Absolutely placed over the list: the list keeps the full screen and
        `contentInsetEndAdjustment` (the measured composer height) is what
        keeps messages clear of it. The sticky view then rides the keyboard,
        and the scroll-to-latest button lives inside it so it stays above the
        keyboard and the composer wherever they are. It stays in normal flow
        because Android does not dispatch touches to children drawn outside a
        parent's bounds.
      */}
      <KeyboardStickyView
        offset={{
          closed: 0,
          opened: keyboardOpenedOffset,
        }}
        style={{
          bottom: 0,
          left: 0,
          position: "absolute",
          right: 0,
          zIndex: 1,
        }}
        testID="chat-keyboard-sticky"
      >
        {endVisible ? null : (
          <ScrollToLatestButton
            foreground={foreground}
            onPress={scrollToLatest}
          />
        )}

        <View
          className="gap-2 px-5"
          onLayout={handleComposerLayout}
          ref={composerRef}
          style={{
            paddingBottom: composerBottomInset,
            paddingTop: COMPOSER_TOP_PADDING,
          }}
          testID="chat-composer"
        >
          <View className="flex-row items-end gap-2">
            <TextInput
              accessibilityLabel={chatLabels.input}
              className="flex-1 rounded-2xl bg-surface px-4 py-3 text-base text-surface-foreground"
              editable={chat.editing === undefined}
              multiline
              onChangeText={chat.setDraft}
              onSubmitEditing={chat.send}
              placeholder="무엇이든 물어보세요"
              ref={composerInputRef}
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
                accessibilityState={{ disabled: false }}
                className="h-11 w-11 items-center justify-center rounded-full bg-accent"
                disabled={false}
                onPress={chat.stop}
                onPressIn={chat.stop}
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
