import {
  KeyboardAwareLegendList,
  useKeyboardChatComposerInset,
  useKeyboardScrollToEnd,
} from "@legendapp/list/keyboard";
import type {
  AnchoredEndSpaceConfig,
  LegendListRef,
  LegendListRenderItemProps,
} from "@legendapp/list/react-native";
import type { UIMessage } from "ai";
import { setStringAsync } from "expo-clipboard";
import { type Ref, useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  KeyboardController,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ChatSession } from "@/features/chat/state/use-chat-session";
import { Icon } from "@/shared/ui/icon";
import { AssistantMessage } from "./assistant-message";
import { chatLabels } from "./chat-labels";
import { LatestMessageButton } from "./latest-message-button";
import { UserMessage } from "./user-message";
import { WaitingAnswer } from "./waiting-answer";

// biome-ignore lint/performance/noBarrelFile: screens and tests share these accessibility names
export { chatLabels } from "./chat-labels";

const INPUT_MAX_HEIGHT = 120;
const INPUT_MIN_HEIGHT = 48;
const KEYBOARD_INPUT_GAP = 8;
const LATEST_OVERLAY_HEIGHT = 60;
const USER_SCROLL_THRESHOLD = 24;
const MESSAGE_TOP_SPACING = 12;
const MESSAGE_BOTTOM_SPACING = 12;
/** Enough to read the messages about to go, not enough to mistake them for staying. */
const DOOMED_OPACITY = 0.38;

function textOfMessage(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function copyText(text: string) {
  setStringAsync(text).catch(() => {
    // Nothing is announced on success either, so a refused clipboard leaves
    // the same screen behind and the person can try again.
  });
}

/**
 * One message, and what can be done with it.
 *
 * `isPending` marks the answer still on its way: it carries no icon row, and
 * while it is arriving no message opens its menu either. `isDoomed` marks the
 * messages an edit in progress would drop.
 */
function PlainTextMessage({
  chat,
  isDoomed,
  isPending,
  message,
}: {
  chat: ChatSession;
  isDoomed: boolean;
  isPending: boolean;
  message: UIMessage;
}) {
  const isEditing = chat.editingMessageId !== undefined;
  const text = textOfMessage(message);
  const copy = useCallback(() => copyText(text), [text]);
  const regenerate = useCallback(
    () => chat.regenerateAnswer(message.id),
    [chat, message.id]
  );
  const edit = useCallback(
    () => chat.beginEdit(message.id),
    [chat, message.id]
  );

  if (!text) {
    return null;
  }

  return (
    <View
      style={{
        marginBottom: MESSAGE_BOTTOM_SPACING,
        opacity: isDoomed ? DOOMED_OPACITY : 1,
      }}
      testID="chat-message-row"
    >
      {message.role === "user" ? (
        <UserMessage
          canOpenMenu={!(chat.isBusy || isEditing)}
          onCopy={copy}
          onEdit={edit}
          text={text}
        />
      ) : (
        <AssistantMessage
          areActionsDisabled={isEditing}
          hasActions={!isPending}
          onCopy={copy}
          onRegenerate={regenerate}
          text={text}
        />
      )}
    </View>
  );
}

function messageKey(message: UIMessage) {
  return message.id;
}

export function ChatPanel({
  chat,
  inputRef,
  topInset = 0,
}: {
  chat: ChatSession;
  /**
   * Handed down by the screen, which decides when the input should take the
   * caret. The panel only says which control that is.
   */
  inputRef?: Ref<TextInput>;
  topInset?: number;
}) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<LegendListRef | null>(null);
  const composerRef = useRef<View | null>(null);
  const [anchorIndex, setAnchorIndex] = useState<number | undefined>();
  const [isFollowingLatest, setIsFollowingLatest] = useState(true);
  const [isPositioningQuestion, setIsPositioningQuestion] = useState(false);
  const [composerHeight, setComposerHeight] = useState(0);
  const [inputHeight, setInputHeight] = useState(INPUT_MIN_HEIGHT);
  const pendingAnchorIndex = useRef<number | undefined>(undefined);
  const userMomentum = useRef<true | undefined>(undefined);
  const userScrollStart = useRef<number | undefined>(undefined);
  const canSend = chat.draft.trim().length > 0 && !chat.isBusy;
  const composerBottomPadding = Math.max(insets.bottom, 12);
  const lastMessage = chat.messages.at(-1);
  const doomedFromIndex = chat.editingMessageId
    ? chat.messages.findIndex((message) => message.id === chat.editingMessageId)
    : -1;
  // The line stands in for the answer from the moment the question goes until
  // its first character lands, which is either before any answer exists or
  // while an answer exists with nothing in it yet.
  const isWaitingForAnswer =
    chat.isBusy &&
    (lastMessage?.role !== "assistant" || textOfMessage(lastMessage) === "");
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

      const { contentOffset } = event.nativeEvent;
      if (contentOffset.y < 0) {
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
  const handleEndVisible = useCallback((visible: boolean) => {
    if (visible) {
      setIsFollowingLatest(true);
    }
  }, []);
  const resizeInput = useCallback(
    (
      event: NativeSyntheticEvent<{
        contentSize: { height: number; width: number };
      }>
    ) => {
      setInputHeight(
        Math.min(
          INPUT_MAX_HEIGHT,
          Math.max(INPUT_MIN_HEIGHT, event.nativeEvent.contentSize.height)
        )
      );
    },
    []
  );
  const updateComposerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onComposerLayout(event);
      setComposerHeight(event.nativeEvent.layout.height);
    },
    [onComposerLayout]
  );
  const positionQuestion = useCallback<
    NonNullable<AnchoredEndSpaceConfig["onReady"]>
  >(
    async ({ anchorIndex: readyAnchorIndex }) => {
      if (readyAnchorIndex !== pendingAnchorIndex.current) {
        return;
      }

      pendingAnchorIndex.current = undefined;
      try {
        await new Promise<void>((resolve, reject) => {
          requestAnimationFrame(() => {
            scrollMessageToEnd({ animated: true, closeKeyboard: true }).then(
              resolve,
              reject
            );
          });
        });
      } catch {
        // The next user action can still recover the scroll position.
      } finally {
        setIsPositioningQuestion(false);
      }
    },
    [scrollMessageToEnd]
  );
  const send = useCallback(() => {
    if (!canSend) {
      return;
    }

    // Sending from the edit state drops the message it started from and
    // everything after it, so the new question lands where that message was.
    const nextAnchorIndex =
      doomedFromIndex >= 0 ? doomedFromIndex : chat.messages.length;
    const isFirstQuestion = nextAnchorIndex === 0;
    setAnchorIndex(nextAnchorIndex);
    setIsFollowingLatest(true);
    setInputHeight(INPUT_MIN_HEIGHT);
    if (!isFirstQuestion) {
      pendingAnchorIndex.current = nextAnchorIndex;
      setIsPositioningQuestion(true);
    }
    chat.send();

    if (isFirstQuestion) {
      requestAnimationFrame(() => {
        KeyboardController.dismiss();
      });
    }
  }, [canSend, chat, doomedFromIndex]);
  const stopAnswer = useCallback(() => {
    chat.stop().catch(() => {
      // The answer stays where it stopped either way.
    });
  }, [chat]);
  const renderMessage = useCallback(
    ({ index, item }: LegendListRenderItemProps<UIMessage>) => (
      <PlainTextMessage
        chat={chat}
        isDoomed={doomedFromIndex >= 0 && index >= doomedFromIndex}
        isPending={chat.isBusy && index === chat.messages.length - 1}
        message={item}
      />
    ),
    [chat, doomedFromIndex]
  );

  return (
    <View className="flex-1 bg-background">
      <KeyboardAwareLegendList
        anchoredEndSpace={
          anchorIndex === undefined
            ? undefined
            : {
                anchorIndex,
                anchorOffset: topInset + MESSAGE_TOP_SPACING,
                onReady: anchorIndex === 0 ? undefined : positionQuestion,
              }
        }
        applyWorkaroundForContentInsetHitTestBug
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: topInset + MESSAGE_TOP_SPACING,
        }}
        contentInsetAdjustmentBehavior="never"
        contentInsetEndAdjustment={contentInsetEndAdjustment}
        data={chat.messages}
        freeze={freeze}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardLiftBehavior="whenAtEnd"
        keyboardOffset={insets.bottom}
        keyboardShouldPersistTaps="handled"
        keyExtractor={messageKey}
        ListFooterComponent={isWaitingForAnswer ? <WaitingAnswer /> : undefined}
        maintainScrollAtEnd={
          isFollowingLatest && !isPositioningQuestion
            ? {
                animated: false,
                on: { dataChange: true, itemLayout: true },
              }
            : false
        }
        maintainScrollAtEndThreshold={0.05}
        maintainVisibleContentPosition={{ data: false, size: true }}
        onEndVisible={handleEndVisible}
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
        offset={{
          closed: 0,
          opened: composerBottomPadding - KEYBOARD_INPUT_GAP,
        }}
      >
        <View
          className="gap-2 bg-background px-5 pt-2"
          onLayout={updateComposerLayout}
          ref={composerRef}
          style={{ paddingBottom: composerBottomPadding }}
          testID="chat-composer"
        >
          {chat.error ? (
            <View className="flex-row items-center gap-2">
              <Text
                accessibilityLiveRegion="assertive"
                accessibilityRole="alert"
                className="flex-1 text-danger text-sm"
                testID="chat-error"
              >
                {chatLabels.errorAnnouncement}
              </Text>
              <Pressable
                accessibilityLabel={chatLabels.retry}
                accessibilityRole="button"
                className="flex-row items-center gap-1 rounded-full border border-border px-3 py-1.5"
                onPress={chat.retry}
                testID="chat-retry"
              >
                <Icon name="regenerate" size="sm" />
                <Text className="text-foreground text-sm">
                  {chatLabels.retry}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {chat.editingMessageId ? (
            <View
              className="flex-row items-center gap-2"
              testID="chat-edit-notice"
            >
              <Icon name="edit" size="sm" tone="muted" />
              <Text className="flex-1 text-muted text-xs leading-5">
                {chatLabels.editNotice}
              </Text>
              <Pressable
                accessibilityLabel={chatLabels.endEdit}
                accessibilityRole="button"
                hitSlop={8}
                onPress={chat.cancelEdit}
                testID="chat-edit-cancel"
              >
                <Icon name="close" size="sm" tone="muted" />
              </Pressable>
            </View>
          ) : null}

          <View className="flex-row items-end gap-2">
            <TextInput
              accessibilityLabel={chatLabels.input}
              className="flex-1 rounded-2xl bg-surface px-4 py-3 text-base text-surface-foreground"
              multiline
              onChangeText={chat.setDraft}
              onContentSizeChange={resizeInput}
              onSubmitEditing={send}
              placeholder="메시지를 입력하세요"
              ref={inputRef}
              returnKeyType="send"
              style={{ height: inputHeight, maxHeight: INPUT_MAX_HEIGHT }}
              submitBehavior="submit"
              testID="chat-input"
              value={chat.draft}
            />
            {/*
              One place, two jobs. While an answer is arriving that place ends
              it; the rest of the time it sends what has been typed.
            */}
            {chat.isBusy ? (
              <Pressable
                accessibilityLabel={chatLabels.stop}
                accessibilityRole="button"
                className="h-11 w-11 items-center justify-center rounded-full bg-accent"
                onPress={stopAnswer}
                testID="chat-send"
              >
                <Icon filled name="stop" size="sm" tone="accentForeground" />
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
                onPress={send}
                testID="chat-send"
              >
                <Icon name="send" tone="accentForeground" />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardStickyView>

      {isFollowingLatest ? null : (
        <KeyboardStickyView
          offset={{
            closed: 0,
            opened: composerBottomPadding - KEYBOARD_INPUT_GAP,
          }}
          pointerEvents="box-none"
          style={{
            bottom: composerHeight,
            height: LATEST_OVERLAY_HEIGHT,
            left: 0,
            position: "absolute",
            right: 0,
          }}
          testID="chat-latest-overlay"
        >
          <View
            className="h-full items-center justify-end pb-2"
            pointerEvents="box-none"
          >
            <LatestMessageButton onPress={moveToLatest} />
          </View>
        </KeyboardStickyView>
      )}
    </View>
  );
}
