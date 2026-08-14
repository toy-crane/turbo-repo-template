import { Text, View } from "react-native";

import { MessageActions } from "./message-actions";

/**
 * An answer, and the row of things to do with it once it is finished.
 *
 * The body stays selectable: no menu is attached here, so a long press is
 * left to the system's own text selection.
 */
export function AssistantMessage({
  areActionsDisabled,
  hasActions,
  onCopy,
  onRegenerate,
  text,
}: {
  areActionsDisabled: boolean;
  hasActions: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
  text: string;
}) {
  return (
    <View className="w-full">
      <Text
        className="text-base text-foreground leading-6"
        selectable
        testID="chat-message-assistant"
      >
        {text}
      </Text>
      {hasActions ? (
        <MessageActions
          isDisabled={areActionsDisabled}
          onCopy={onCopy}
          onRegenerate={onRegenerate}
        />
      ) : null}
    </View>
  );
}
