import type { UIMessage } from "ai";
import { memo } from "react";
import { View } from "react-native";

import { MessagePart } from "./message-parts";

/**
 * One message in the list, memoized so a streaming update to the last message
 * does not re-render every other row. `useChat` keeps the object identity of
 * untouched messages stable between updates, which is what the reference
 * comparison here relies on.
 */
function MessageRowComponent({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <View
      className={
        isUser
          ? "mb-3 max-w-[85%] self-end rounded-2xl bg-accent px-4 py-3"
          : "mb-3 w-full self-start"
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
  );
}

export const MessageRow = memo(MessageRowComponent);
