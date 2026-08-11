import type { UIMessage } from "ai";
import { setStringAsync } from "expo-clipboard";
import {
  ImpactFeedbackStyle,
  impactAsync,
  NotificationFeedbackType,
  notificationAsync,
} from "expo-haptics";
import { useThemeColor } from "heroui-native/hooks";
import { Menu, type MenuTriggerRef } from "heroui-native/menu";
import { PressableFeedback } from "heroui-native/pressable-feedback";
import { memo, type ReactNode, useCallback, useRef, useState } from "react";
import {
  type AccessibilityActionEvent,
  AccessibilityInfo,
  findNodeHandle,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  type StyleProp,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";

import type { ChatSession } from "@/features/chat/state/use-chat-session";
import { Icon, type IconName } from "@/shared/ui/icon/icon";
import { chatLabels } from "./chat-labels";
import { MessagePart } from "./message-parts";
import { useCopyFeedback } from "./use-copy-feedback";

/** The message body the clipboard gets: text parts joined by blank lines. */
function copyTextOf(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n");
}

function ActionButton({
  active = false,
  disabled = false,
  icon,
  iconTestID,
  label,
  onPress,
  testID,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: IconName;
  iconTestID?: string;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  const tint = useThemeColor("muted");

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled, ...(active ? { selected: true } : {}) }}
      className={
        disabled
          ? "h-11 w-11 items-center justify-center opacity-40"
          : "h-11 w-11 items-center justify-center"
      }
      disabled={disabled}
      onPress={onPress}
      testID={testID}
    >
      <Icon
        name={icon}
        size={20}
        testID={iconTestID}
        tintColor={tint}
        weight="semibold"
      />
    </Pressable>
  );
}

export function AssistantError({
  disabled,
  retryAction,
}: {
  disabled: boolean;
  retryAction: () => void;
}) {
  return (
    <View className="items-start" testID="chat-error">
      <Text className="text-danger text-sm">잠시 뒤에 다시 보내 주세요.</Text>
      <Pressable
        accessibilityLabel={chatLabels.retry}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        className="min-h-11 justify-center px-2"
        disabled={disabled}
        onPress={retryAction}
      >
        <Text className={disabled ? "text-muted" : "text-link"}>
          다시 보내기
        </Text>
      </Pressable>
    </View>
  );
}

/** The stable action strip shown only under an AI answer. */
function AssistantMessageActions({
  message,
  regenerateAction,
  regenerateDisabled,
}: {
  message: UIMessage;
  regenerateAction?: () => void;
  regenerateDisabled: boolean;
}) {
  const { copied, copy } = useCopyFeedback(() => copyTextOf(message));

  return (
    <View className="flex-row items-center">
      <ActionButton
        active={copied}
        icon={copied ? "check" : "copy"}
        iconTestID={copied ? "chat-ai-copy-check" : "chat-ai-copy-icon"}
        label={copied ? chatLabels.copied : chatLabels.copyMessage}
        onPress={copy}
        testID={`chat-copy-${message.id}`}
      />
      {regenerateAction ? (
        <ActionButton
          disabled={regenerateDisabled}
          icon="regenerate"
          label={chatLabels.regenerate}
          onPress={regenerateAction}
          testID="chat-regenerate"
        />
      ) : null}
    </View>
  );
}

function InlineMessageEditor({
  cancelEdit,
  confirmEdit,
  draft,
  messageId,
  setEditDraft,
}: {
  cancelEdit: () => void;
  confirmEdit: () => void;
  draft: string;
  messageId: string;
  setEditDraft: (value: string) => void;
}) {
  const canSend = draft.trim().length > 0;

  return (
    <View
      className="max-w-[85%] gap-2 rounded-2xl bg-accent px-4 py-3"
      testID={`chat-inline-editor-${messageId}`}
    >
      <TextInput
        accessibilityLabel={chatLabels.editInput}
        autoFocus
        className="min-w-48 text-accent-foreground text-base"
        multiline
        onChangeText={setEditDraft}
        onSubmitEditing={confirmEdit}
        returnKeyType="send"
        submitBehavior="submit"
        testID={`chat-inline-edit-input-${messageId}`}
        value={draft}
      />
      <View className="flex-row justify-end gap-2">
        <Pressable
          accessibilityLabel={chatLabels.cancelEdit}
          accessibilityRole="button"
          className="min-h-11 justify-center px-3"
          onPress={cancelEdit}
          testID={`chat-inline-edit-cancel-${messageId}`}
        >
          <Text className="font-semibold text-accent-foreground">취소</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={chatLabels.sendEdit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSend }}
          className={
            canSend
              ? "min-h-11 justify-center px-3"
              : "min-h-11 justify-center px-3 opacity-40"
          }
          disabled={!canSend}
          onPress={confirmEdit}
          testID={`chat-inline-edit-send-${messageId}`}
        >
          <Text className="font-semibold text-accent-foreground">보내기</Text>
        </Pressable>
      </View>
    </View>
  );
}

function UserMessage({
  cancelEdit,
  confirmEdit,
  editing,
  editDisabled,
  message,
  setEditDraft,
  startEdit,
}: {
  cancelEdit: () => void;
  confirmEdit: () => void;
  editing: ChatSession["editing"];
  editDisabled: boolean;
  message: UIMessage;
  setEditDraft: (value: string) => void;
  startEdit: (messageId: string) => void;
}) {
  const [foreground, muted] = useThemeColor(["foreground", "muted"]);
  const bubbleRef = useRef<View>(null);
  const menuRequestedRef = useRef(false);
  const triggerRef = useRef<MenuTriggerRef>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const isEditing = editing?.messageId === message.id;
  const text = copyTextOf(message);

  const closeMenu = useCallback(() => {
    menuRequestedRef.current = false;
    setMenuOpen(false);
    triggerRef.current?.close();
  }, []);

  const copy = useCallback(async () => {
    closeMenu();

    try {
      await setStringAsync(text);
    } catch {
      return;
    }

    notificationAsync(NotificationFeedbackType.Success).catch(() => undefined);
    AccessibilityInfo.announceForAccessibility(chatLabels.copied);
  }, [closeMenu, text]);

  const edit = useCallback(() => {
    if (!editDisabled) {
      closeMenu();
      startEdit(message.id);
    }
  }, [closeMenu, editDisabled, message.id, startEdit]);

  const openMenu = useCallback(() => {
    menuRequestedRef.current = true;
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => undefined);

    if (Platform.OS !== "android") {
      triggerRef.current?.open();
    }
  }, []);

  const finishLongPress = useCallback(() => {
    if (Platform.OS === "android" && menuRequestedRef.current) {
      triggerRef.current?.open();
    }
  }, []);

  const handleMenuOpenChange = useCallback((open: boolean) => {
    if (open && !menuRequestedRef.current) {
      return;
    }

    menuRequestedRef.current = false;
    setMenuOpen(open);
  }, []);

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === "copy") {
        copy();
      } else if (event.nativeEvent.actionName === "edit") {
        edit();
      }
    },
    [copy, edit]
  );

  const handleCancelEdit = useCallback(() => {
    cancelEdit();
    requestAnimationFrame(() => {
      const tag = findNodeHandle(bubbleRef.current);

      if (tag !== null) {
        AccessibilityInfo.setAccessibilityFocus(tag);
      }
    });
  }, [cancelEdit]);

  if (isEditing) {
    return (
      <InlineMessageEditor
        cancelEdit={handleCancelEdit}
        confirmEdit={confirmEdit}
        draft={editing.draft}
        messageId={message.id}
        setEditDraft={setEditDraft}
      />
    );
  }

  return (
    <Menu
      isOpen={menuOpen}
      onOpenChange={handleMenuOpenChange}
      presentation="popover"
    >
      <Menu.Trigger asChild ref={triggerRef}>
        <PressableFeedback
          accessibilityActions={
            editDisabled
              ? [{ label: chatLabels.copyUserMessage, name: "copy" }]
              : [
                  { label: chatLabels.copyUserMessage, name: "copy" },
                  { label: chatLabels.editMessage, name: "edit" },
                ]
          }
          accessibilityLabel={text}
          accessibilityRole="button"
          accessibilityState={{ expanded: menuOpen }}
          animation={{ scale: { value: 0.985 } }}
          className="overflow-hidden rounded-2xl bg-accent"
          onAccessibilityAction={handleAccessibilityAction}
          onLongPress={openMenu}
          onPressOut={finishLongPress}
          ref={bubbleRef}
          testID={`chat-user-message-${message.id}`}
        >
          <PressableFeedback.Highlight
            animation={{ opacity: { value: [0, 0.08] } }}
          />
          <View className="px-4 py-3" pointerEvents="none">
            {message.parts.map((part, index) => (
              <MessagePart
                isStreaming={false}
                // biome-ignore lint/suspicious/noArrayIndexKey: position is the part identity
                key={`${message.id}-${index}`}
                messageId={message.id}
                part={part}
                role={message.role}
              />
            ))}
          </View>
        </PressableFeedback>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Overlay
          className="bg-black/10"
          closeOnPress
          testID="chat-user-menu-overlay"
        />
        <Menu.Content
          align="end"
          avoidCollisions
          className="min-w-40 gap-1 p-1"
          placement="bottom"
          presentation="popover"
          testID="chat-user-menu"
        >
          <Menu.Item
            accessibilityLabel={chatLabels.copyUserMessage}
            className="flex-row items-center gap-3 px-3"
            onPress={copy}
            testID={`chat-user-copy-${message.id}`}
          >
            <Icon name="copy" size={20} tintColor={muted} weight="semibold" />
            <Menu.ItemTitle>{chatLabels.copyUserMessage}</Menu.ItemTitle>
          </Menu.Item>
          <Menu.Item
            accessibilityLabel={chatLabels.editMessage}
            className="flex-row items-center gap-3 px-3"
            isDisabled={editDisabled}
            onPress={edit}
            testID={`chat-user-edit-${message.id}`}
          >
            <Icon
              name="edit"
              size={20}
              tintColor={foreground}
              weight="semibold"
            />
            <Menu.ItemTitle>{chatLabels.editMessage}</Menu.ItemTitle>
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  );
}

/** One memoized row in the virtual conversation list. */
function MessageRowComponent({
  cancelEdit = () => undefined,
  confirmEdit = () => undefined,
  editing,
  editDisabled = false,
  errorAction,
  errorDisabled = false,
  isStreaming = false,
  message,
  minimumHeight,
  onLayout,
  regenerateAction,
  regenerateDisabled = false,
  setEditDraft = () => undefined,
  startEdit = () => undefined,
  testID,
}: {
  cancelEdit?: () => void;
  confirmEdit?: () => void;
  editing?: ChatSession["editing"];
  editDisabled?: boolean;
  errorAction?: () => void;
  errorDisabled?: boolean;
  isStreaming?: boolean;
  message: UIMessage;
  minimumHeight?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
  regenerateAction?: () => void;
  regenerateDisabled?: boolean;
  setEditDraft?: (value: string) => void;
  startEdit?: (messageId: string) => void;
  testID?: string;
}) {
  const isUser = message.role === "user";
  const lastTextIndex = message.parts.findLastIndex(
    (part) => part.type === "text"
  );
  const rowStyle: StyleProp<ViewStyle> =
    minimumHeight === undefined ? undefined : { minHeight: minimumHeight };
  let actions: ReactNode = null;

  if (errorAction) {
    actions = (
      <AssistantError disabled={errorDisabled} retryAction={errorAction} />
    );
  } else if (!isUser) {
    actions = (
      <AssistantMessageActions
        message={message}
        regenerateAction={regenerateAction}
        regenerateDisabled={regenerateDisabled}
      />
    );
  }

  return (
    <View
      className={isUser ? "mb-3 items-end" : "mb-3 items-start"}
      onLayout={onLayout}
      style={rowStyle}
      testID={errorAction ? "chat-answer-error" : testID}
    >
      {isUser ? (
        <UserMessage
          cancelEdit={cancelEdit}
          confirmEdit={confirmEdit}
          editDisabled={editDisabled}
          editing={editing}
          message={message}
          setEditDraft={setEditDraft}
          startEdit={startEdit}
        />
      ) : (
        <View className="w-full">
          {message.parts.map((part, index) => (
            <MessagePart
              isStreaming={isStreaming && index === lastTextIndex}
              // biome-ignore lint/suspicious/noArrayIndexKey: position is the part identity
              key={`${message.id}-${index}`}
              messageId={message.id}
              part={part}
              role={message.role}
            />
          ))}
        </View>
      )}
      {actions}
    </View>
  );
}

export const MessageRow = memo(MessageRowComponent);
