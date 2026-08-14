import { View } from "react-native";
import type { TextContextMenuItem } from "react-native-enriched-markdown";

import { MarkdownAnswer } from "./markdown-answer";
import { MessageActions } from "./message-actions";

/**
 * An answer, and the row of things to do with it once it is finished.
 *
 * The body is Markdown from the first character on, so what arrives half
 * written still reads as an answer rather than as its own source. No menu is
 * attached here: selection and the code block's own copy button belong to the
 * renderer, which is also what leaves a long press to the system. What this
 * app adds to that selection arrives as `selectionMenuItems`.
 */
export function AssistantMessage({
  areActionsDisabled,
  hasActions,
  onCopy,
  onRegenerate,
  selectionMenuItems,
  text,
}: {
  areActionsDisabled: boolean;
  hasActions: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
  selectionMenuItems?: TextContextMenuItem[];
  text: string;
}) {
  return (
    <View className="w-full">
      <MarkdownAnswer
        contextMenuItems={selectionMenuItems}
        markdown={text}
        testID="chat-message-assistant"
      />
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
