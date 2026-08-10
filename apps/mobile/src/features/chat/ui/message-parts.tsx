import type { UIMessage } from "ai";
import { Text, View } from "react-native";

import { MarkdownView } from "./markdown/markdown-view";

type MessagePartValue = UIMessage["parts"][number];

/**
 * One part of a message, drawn by kind.
 *
 * Text is the only kind the MVP server actually sends. Every other kind gets
 * a quiet placeholder for now so an unknown part can never take the screen
 * down; the file, source and tool renderers replace it in a later task.
 */
export function MessagePart({
  messageId,
  part,
  role,
}: {
  messageId: string;
  part: MessagePartValue;
  role: UIMessage["role"];
}) {
  if (part.type === "text") {
    // Only the AI's answers carry Markdown; what the person typed stays
    // exactly as they typed it.
    if (role === "assistant") {
      return (
        <View testID="chat-message-assistant">
          <MarkdownView markdown={part.text} />
        </View>
      );
    }

    return (
      <Text
        className={
          role === "user"
            ? "text-accent-foreground"
            : "text-base text-foreground leading-6"
        }
        selectable
        testID={`chat-message-${role}`}
      >
        {part.text}
      </Text>
    );
  }

  // `step-start` is a boundary marker, not content.
  if (part.type === "step-start") {
    return null;
  }

  return (
    <Text
      className="text-muted-foreground text-sm"
      testID={`chat-part-unsupported-${messageId}`}
    >
      아직 표시할 수 없는 내용입니다.
    </Text>
  );
}
