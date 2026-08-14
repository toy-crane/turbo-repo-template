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
import {
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import Animated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  ReduceMotion,
  SlideInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ChatSession } from "@/features/chat/state/use-chat-session";
import { Icon } from "@/shared/ui/icon";
import { AssistantMessage } from "./assistant-message";
import { chatLabels } from "./chat-labels";
import { ComposerSurface } from "./composer-surface";
import { LatestMessageButton } from "./latest-message-button";
import { SideChatCount, type SideChatEntry } from "./side-chat-count";
import { SideChatSource } from "./side-chat-source";
import { useEnteringMessage } from "./use-entering-message";
import { useLateAnswer } from "./use-late-answer";
import { UserMessage } from "./user-message";
import { WaitingAnswer } from "./waiting-answer";

// biome-ignore lint/performance/noBarrelFile: screens and tests share these accessibility names
export { chatLabels } from "./chat-labels";
export type { SideChatEntry } from "./side-chat-count";

/** What starting a side chat needs to know: the answer, and the words in it. */
export interface AskInSideChat {
  messageId: string;
  phrase: string;
}

const INPUT_MAX_HEIGHT = 120;
const INPUT_MIN_HEIGHT = 48;
const KEYBOARD_INPUT_GAP = 8;
const LATEST_OVERLAY_HEIGHT = 60;
/** The row the side chat count takes when it stacks above the composer too. */
const SIDE_COUNT_OVERLAY_HEIGHT = 44;
const USER_SCROLL_THRESHOLD = 24;
const MESSAGE_TOP_SPACING = 12;
/** Enough to read the messages about to go, not enough to mistake them for staying. */
const DOOMED_OPACITY = 0.38;
/**
 * The button rises out of the composer and tucks back down into it rather than
 * appearing on the spot. Each direction gets the easing that suits it: coming
 * in slows as it settles, going out starts gently and clears away. Leaving
 * stays quicker than arriving, so reaching the newest message feels like the
 * button getting out of the way. Both step aside when the system asks for less
 * motion.
 */
const LATEST_ENTERING = FadeInDown.duration(240)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const LATEST_EXITING = FadeOutDown.duration(160)
  .easing(Easing.in(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
/**
 * The question the person just sent rises from below the screen into the place
 * the list has already made for it. It sets off quickly and eases to a stop, so
 * the message is readable well before it settles. The list's own placement is
 * untouched: this is only how the row gets there.
 *
 * The curve is the one the button above already uses. An exponential ease-out
 * was tried first and measured on a device: three quarters of the travel was
 * over before the row cleared the keyboard, so what reached the eye was a jump
 * rather than a rise.
 */
const MESSAGE_ENTERING = SlideInDown.duration(400)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);

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
 * messages an edit in progress would drop. `isEntering` marks the one question
 * that comes in from below, and the row reports back once it has, so the list
 * rebuilding the row later leaves it where it is.
 */
function PlainTextMessage({
  areActionsDisabled,
  canOpenMenu,
  isDoomed,
  isEntering,
  isPending,
  message,
  onAskInSideChat,
  onBeginEdit,
  onEntered,
  onRegenerate,
}: {
  areActionsDisabled: boolean;
  canOpenMenu: boolean;
  isDoomed: boolean;
  isEntering: boolean;
  isPending: boolean;
  message: UIMessage;
  onAskInSideChat: ((input: AskInSideChat) => void) | undefined;
  onBeginEdit: (messageId: string) => void;
  onEntered: () => void;
  onRegenerate: (messageId: string) => void;
}) {
  const text = textOfMessage(message);
  const copy = useCallback(() => copyText(text), [text]);
  const regenerate = useCallback(
    () => onRegenerate(message.id),
    [message.id, onRegenerate]
  );
  const edit = useCallback(
    () => onBeginEdit(message.id),
    [message.id, onBeginEdit]
  );
  // Added to the system's own selection menu rather than replacing it, so
  // copy, look up and translate stay where they were. It is hidden — not
  // removed — while an answer is arriving or a message is being rewritten,
  // which is the same condition that closes the message menus.
  const selectionMenuItems = useMemo(
    () =>
      onAskInSideChat
        ? [
            {
              onPress: ({ text: phrase }: { text: string }) =>
                onAskInSideChat({ messageId: message.id, phrase }),
              text: chatLabels.askInSideChat,
              visible: canOpenMenu,
            },
          ]
        : undefined,
    [canOpenMenu, message.id, onAskInSideChat]
  );
  // The row keeps the answer it was built with. Reporting back below takes the
  // entry away from every later row, and this row is already on its way in.
  const [playsEntry] = useState(isEntering);

  useEffect(() => {
    if (isEntering) {
      onEntered();
    }
  }, [isEntering, onEntered]);

  if (!text) {
    return null;
  }

  return (
    <Animated.View
      className="mb-4"
      entering={playsEntry ? MESSAGE_ENTERING : undefined}
      style={{ opacity: isDoomed ? DOOMED_OPACITY : 1 }}
      testID="chat-message-row"
    >
      {message.role === "user" ? (
        <UserMessage
          canOpenMenu={canOpenMenu}
          onCopy={copy}
          onEdit={edit}
          text={text}
        />
      ) : (
        <AssistantMessage
          areActionsDisabled={areActionsDisabled}
          hasActions={!isPending}
          onCopy={copy}
          onRegenerate={regenerate}
          selectionMenuItems={selectionMenuItems}
          text={text}
        />
      )}
    </Animated.View>
  );
}

function messageKey(message: UIMessage) {
  return message.id;
}

/**
 * The ways back, stacked in one column just above the composer.
 *
 * The newest message and a side chat are both places a person left, and both
 * are reached from the same spot however far back they have read. The count
 * takes itself away when there is nothing to go back into.
 */
function ReturnControls({
  isEditing,
  isFollowingLatest,
  onMoveToLatest,
  onOpenSideChat,
  sideChats,
}: {
  isEditing: boolean;
  isFollowingLatest: boolean;
  onMoveToLatest: () => void;
  onOpenSideChat: ((id: string) => void) | undefined;
  sideChats: SideChatEntry[] | undefined;
}) {
  return (
    <View
      className="h-full items-center justify-end gap-2 pb-2"
      pointerEvents="box-none"
    >
      {isFollowingLatest ? null : (
        <Animated.View
          entering={LATEST_ENTERING}
          exiting={LATEST_EXITING}
          pointerEvents="box-none"
        >
          <LatestMessageButton onPress={onMoveToLatest} />
        </Animated.View>
      )}
      {sideChats && onOpenSideChat ? (
        <SideChatCount
          chats={sideChats}
          // Pressing it during an edit would leave the notice above a composer
          // that is no longer the one it is about.
          isDisabled={isEditing}
          onOpen={onOpenSideChat}
        />
      ) : null}
    </View>
  );
}

export function ChatPanel({
  chat,
  inputRef,
  onAskInSideChat,
  onOpenSideChat,
  sideChats,
  source,
  topInset = 0,
}: {
  chat: ChatSession;
  /**
   * Handed down by the screen, which decides when the input should take the
   * caret. The panel only says which control that is.
   */
  inputRef?: Ref<TextInput>;
  /**
   * What selecting part of a finished answer offers. Left out inside a side
   * chat, which is what keeps a side chat from starting another one.
   */
  onAskInSideChat?: (input: AskInSideChat) => void;
  onOpenSideChat?: (id: string) => void;
  /** The side chats to get back into, newest first. */
  sideChats?: SideChatEntry[];
  /** The read-only phrase a side chat started from. */
  source?: string;
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
  const hasSideChats = sideChats !== undefined && sideChats.length > 0;
  const lastMessage = chat.messages.at(-1);
  const doomedFromIndex = chat.editingMessageId
    ? chat.messages.findIndex((message) => message.id === chat.editingMessageId)
    : -1;
  // The answer is still on its way from the moment the question goes until its
  // first character lands, which is either before any answer exists or while an
  // answer exists with nothing in it yet. Only a wait long enough to notice
  // puts a line in the answer's place; a quick one shows nothing at all.
  const isWaitingForAnswer =
    chat.isBusy &&
    (lastMessage?.role !== "assistant" || textOfMessage(lastMessage) === "");
  const isAnswerLate = useLateAnswer(isWaitingForAnswer);
  const { enteringMessageId, markEntered, markSent } = useEnteringMessage(
    chat.messages
  );
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
    markSent();
    chat.send();

    if (isFirstQuestion) {
      requestAnimationFrame(() => {
        KeyboardController.dismiss();
      });
    }
  }, [canSend, chat, doomedFromIndex, markSent]);
  const stopAnswer = useCallback(() => {
    chat.stop().catch(() => {
      // The answer stays where it stopped either way.
    });
  }, [chat]);
  // Named fields rather than the session itself: the session is a new object
  // on every keystroke, and every message in view would be redrawn with it.
  const { beginEdit, isBusy, regenerateAnswer } = chat;
  const isEditing = chat.editingMessageId !== undefined;
  const messageCount = chat.messages.length;
  // The list redraws a row when the messages change or when this does, and a
  // fresh `renderItem` alone does not reach it. Everything a row reads beyond
  // its own message belongs here: without it the icon row never appears, since
  // the last answer arrives while the request is still open and nothing
  // changes in the list when it closes.
  const rowState = `${isBusy}|${isEditing}|${doomedFromIndex}`;
  const renderMessage = useCallback(
    ({ index, item }: LegendListRenderItemProps<UIMessage>) => (
      <PlainTextMessage
        areActionsDisabled={isEditing}
        canOpenMenu={!(isBusy || isEditing)}
        isDoomed={doomedFromIndex >= 0 && index >= doomedFromIndex}
        isEntering={item.id === enteringMessageId}
        isPending={isBusy && index === messageCount - 1}
        message={item}
        onAskInSideChat={onAskInSideChat}
        onBeginEdit={beginEdit}
        onEntered={markEntered}
        onRegenerate={regenerateAnswer}
      />
    ),
    [
      beginEdit,
      doomedFromIndex,
      enteringMessageId,
      isBusy,
      isEditing,
      markEntered,
      messageCount,
      onAskInSideChat,
      regenerateAnswer,
    ]
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
        extraData={rowState}
        freeze={freeze}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardLiftBehavior="whenAtEnd"
        keyboardOffset={insets.bottom}
        keyboardShouldPersistTaps="handled"
        keyExtractor={messageKey}
        ListFooterComponent={isAnswerLate ? <WaitingAnswer /> : undefined}
        ListHeaderComponent={
          source === undefined ? undefined : <SideChatSource phrase={source} />
        }
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

      {/*
        The composer floats over the list rather than taking a row of its own
        below it. Laid out as a sibling it would shorten the list, and the
        conversation would stop at a straight edge above the control instead of
        running on under it — with nothing behind the glass to show through.
        What keeps the messages clear of it is the end inset the list already
        reports from this composer's measured height.
      */}
      <KeyboardStickyView
        offset={{
          closed: 0,
          opened: composerBottomPadding - KEYBOARD_INPUT_GAP,
        }}
        style={{ bottom: 0, left: 0, position: "absolute", right: 0 }}
      >
        {/*
          No background of its own either: a band across the screen would cut
          the list off just as surely. The notice and the error sit on the same
          open ground, just above the control rather than inside it.
        */}
        <View
          className="gap-2 px-5 pt-2"
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

          <ComposerSurface>
            <TextInput
              accessibilityLabel={chatLabels.input}
              className="flex-1 px-3 py-2.5 text-base text-foreground"
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

              Both say whether they are disabled rather than leaving it out.
              The two sit at the same place in the tree, so React keeps one
              instance and only changes its props; on Android a `disabled` that
              stops being passed is never cleared on the native view, and the
              stop button inherits the send button's disabled state — it draws
              normally and refuses every touch.
            */}
            {chat.isBusy ? (
              <Pressable
                accessibilityLabel={chatLabels.stop}
                accessibilityRole="button"
                accessibilityState={{ disabled: false }}
                className="h-11 w-11 items-center justify-center rounded-full bg-accent"
                disabled={false}
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
          </ComposerSurface>
        </View>
      </KeyboardStickyView>

      {/*
        The overlay stays mounted so that the button leaving has something to
        animate inside. Only the button itself comes and goes, which is also
        what keeps it out of the accessibility tree while the newest message
        is already in view.

        The way back to the newest message and the way back into a side chat
        stack here in one column: both are ways back, and both belong just
        above the composer wherever the person is reading.
      */}
      <KeyboardStickyView
        offset={{
          closed: 0,
          opened: composerBottomPadding - KEYBOARD_INPUT_GAP,
        }}
        pointerEvents="box-none"
        style={{
          bottom: composerHeight,
          height:
            LATEST_OVERLAY_HEIGHT +
            (hasSideChats ? SIDE_COUNT_OVERLAY_HEIGHT : 0),
          left: 0,
          position: "absolute",
          right: 0,
        }}
        testID="chat-latest-overlay"
      >
        <ReturnControls
          isEditing={isEditing}
          isFollowingLatest={isFollowingLatest}
          onMoveToLatest={moveToLatest}
          onOpenSideChat={onOpenSideChat}
          sideChats={sideChats}
        />
      </KeyboardStickyView>
    </View>
  );
}
