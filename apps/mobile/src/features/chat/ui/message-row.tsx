import type { UIMessage } from "ai";
import { useThemeColor } from "heroui-native/hooks";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";

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
  disabled = false,
  icon,
  label,
  onPress,
  testID,
}: {
  disabled?: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  const tint = useThemeColor("muted");

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={
        disabled
          ? "h-11 w-11 items-center justify-center opacity-40"
          : "h-11 w-11 items-center justify-center"
      }
      disabled={disabled}
      onPress={onPress}
      testID={testID}
    >
      <Icon name={icon} size={18} tintColor={tint} />
    </Pressable>
  );
}

/**
 * The action strip under one message. Copy is always there; edit and
 * regenerate arrive only on the rows that own them.
 */
function MessageActions({
  editAction,
  editDisabled,
  message,
  regenerateAction,
  regenerateDisabled,
}: {
  editAction?: () => void;
  editDisabled: boolean;
  message: UIMessage;
  regenerateAction?: () => void;
  regenerateDisabled: boolean;
}) {
  const { copied, copy } = useCopyFeedback(() => copyTextOf(message));

  return (
    <View className="flex-row items-center">
      <ActionButton
        icon="copy"
        label={chatLabels.copyMessage}
        onPress={copy}
        testID={`chat-copy-${message.id}`}
      />
      {/* Copied is words, not a color, so every reader gets the signal. */}
      {copied ? <Text className="text-muted text-xs">복사됨</Text> : null}
      {editAction ? (
        <ActionButton
          disabled={editDisabled}
          icon="edit"
          label={chatLabels.editResend}
          onPress={editAction}
          testID="chat-edit-resend"
        />
      ) : null}
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

/**
 * One message in the list, memoized so a streaming update to the last message
 * does not re-render every other row. `useChat` keeps the object identity of
 * untouched messages stable between updates, and rows that own no edit or
 * regenerate action receive constant props, so the reference comparison here
 * keeps them quiet.
 */
function MessageRowComponent({
  editAction,
  editDisabled = false,
  message,
  regenerateAction,
  regenerateDisabled = false,
}: {
  editAction?: () => void;
  editDisabled?: boolean;
  message: UIMessage;
  regenerateAction?: () => void;
  regenerateDisabled?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <View className={isUser ? "mb-3 items-end" : "mb-3 items-start"}>
      <View
        className={
          isUser ? "max-w-[85%] rounded-2xl bg-accent px-4 py-3" : "w-full"
        }
      >
        {message.parts.map((part, index) => (
          <MessagePart
            // Parts only ever append while a message streams, so the position
            // is a stable identity for them.
            // biome-ignore lint/suspicious/noArrayIndexKey: position is the part identity
            key={`${message.id}-${index}`}
            messageId={message.id}
            part={part}
            role={message.role}
          />
        ))}
      </View>
      <MessageActions
        editAction={editAction}
        editDisabled={editDisabled}
        message={message}
        regenerateAction={regenerateAction}
        regenerateDisabled={regenerateDisabled}
      />
    </View>
  );
}

export const MessageRow = memo(MessageRowComponent);
