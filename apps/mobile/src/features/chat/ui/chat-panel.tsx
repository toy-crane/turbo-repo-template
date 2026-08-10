import type { UIMessage } from "ai";
import { Button } from "heroui-native/button";
import { Input } from "heroui-native/input";
import { Label } from "heroui-native/label";
import { Spinner } from "heroui-native/spinner";
import { TextField } from "heroui-native/text-field";
import { ScrollView, Text, View } from "react-native";

import { useChatSession } from "@/features/chat/state/use-chat-session";

/** Accessibility names double as the contract for tests and agent-device. */
export const chatLabels = {
  generating: "답변을 만드는 중",
  input: "메시지",
  retry: "다시 보내기",
  send: "보내기",
} as const;

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <View
      className={
        isUser
          ? "self-end rounded-2xl bg-accent px-4 py-3"
          : "self-start rounded-2xl bg-surface px-4 py-3"
      }
    >
      {/*
        The name sits on the text, not on the bubble around it, so `get text`
        returns the answer itself. On the container it returns only the id,
        which cannot tell an empty answer from a full one.
      */}
      <Text
        className={
          isUser ? "text-accent-foreground" : "text-surface-foreground"
        }
        selectable
        testID={`chat-message-${message.role}`}
      >
        {messageText(message)}
      </Text>
    </View>
  );
}

/**
 * The conversation and the controls that drive it.
 *
 * The access token comes from the screen that assembles this panel, so the
 * chat feature never reaches into the auth feature for a session.
 */
export function ChatPanel({
  accessToken,
}: {
  accessToken: string | undefined;
}) {
  const chat = useChatSession(accessToken);

  return (
    <ScrollView
      className="bg-background"
      contentContainerClassName="gap-4 px-5 pt-5 pb-6"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-3">
        {chat.messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </View>

      {chat.isBusy ? (
        <View className="flex-row items-center gap-2" testID="chat-generating">
          <Spinner size="sm" />
          <Text className="text-muted-foreground text-sm">
            {chatLabels.generating}
          </Text>
        </View>
      ) : null}

      {chat.error ? (
        <View className="gap-2">
          <Text
            accessibilityRole="alert"
            className="text-danger text-sm"
            testID="chat-error"
          >
            답변을 받지 못했습니다. 잠시 뒤에 다시 시도해 주세요.
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

      <TextField>
        {/*
          The field itself carries the name, so the visible label stays out of
          the accessibility tree and a selector cannot land on the caption.
        */}
        <Label
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          메시지
        </Label>
        <Input
          accessibilityLabel={chatLabels.input}
          onChangeText={chat.setDraft}
          onSubmitEditing={chat.send}
          placeholder="무엇이든 물어보세요"
          returnKeyType="send"
          testID="chat-input"
          value={chat.draft}
        />
      </TextField>

      <Button
        accessibilityLabel={chatLabels.send}
        isDisabled={chat.isBusy || chat.draft.trim().length === 0}
        onPress={chat.send}
        testID="chat-send"
      >
        {chat.isBusy ? <Spinner size="sm" /> : null}
        <Button.Label>보내기</Button.Label>
      </Button>
    </ScrollView>
  );
}
