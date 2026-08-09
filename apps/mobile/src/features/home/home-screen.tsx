import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { Button } from "heroui-native/button";
import { Input } from "heroui-native/input";
import { Label } from "heroui-native/label";
import { Spinner } from "heroui-native/spinner";
import { TextField } from "heroui-native/text-field";
import { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { useAuthSession } from "../auth/auth-session";
import { createChatTransport } from "../chat/chat-transport";

/** Which request is in flight. Also what blocks a second one. */
type ChatAction = "retry" | "send";

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
      testID={`chat-message-${message.role}`}
    >
      <Text
        className={
          isUser ? "text-accent-foreground" : "text-surface-foreground"
        }
        selectable
      >
        {messageText(message)}
      </Text>
    </View>
  );
}

export function HomeScreen() {
  const { session } = useAuthSession();
  const [draft, setDraft] = useState("");

  // The transport reads this on every send, so it has to see the session the
  // provider holds now rather than the one captured when the screen mounted.
  const currentSession = useRef(session);

  currentSession.current = session;

  const transport = useMemo(
    () => createChatTransport(() => currentSession.current?.access_token),
    []
  );
  const { error, messages, regenerate, sendMessage, status } = useChat({
    transport,
  });

  const isBusy = status === "streaming" || status === "submitted";
  const running = useRef<ChatAction | undefined>(undefined);

  /**
   * One entry point for both requests this screen can start.
   *
   * The ref, not the status, is what stops a double tap: two presses in the
   * same frame both read the status from before the first one, so a status
   * check alone would let the second through and send the message twice.
   */
  const run = useCallback((action: ChatAction, work: () => Promise<void>) => {
    if (running.current !== undefined) {
      return;
    }

    running.current = action;
    work().finally(() => {
      running.current = undefined;
    });
  }, []);

  const send = useCallback(() => {
    const text = draft.trim();

    // No session means no request. Getting the person to a sign-in screen is
    // the auth implementation's job, not this screen's.
    if (!(text && currentSession.current) || isBusy) {
      return;
    }

    run("send", () => {
      setDraft("");

      return sendMessage({ text });
    });
  }, [draft, isBusy, run, sendMessage]);

  const retry = useCallback(() => {
    if (isBusy) {
      return;
    }

    run("retry", () => regenerate());
  }, [isBusy, regenerate, run]);

  return (
    <ScrollView
      className="bg-background"
      contentContainerClassName="gap-4 px-5 pt-5 pb-6"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-3">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </View>

      {isBusy ? (
        <View className="flex-row items-center gap-2" testID="chat-generating">
          <Spinner size="sm" />
          <Text className="text-muted-foreground text-sm">
            {chatLabels.generating}
          </Text>
        </View>
      ) : null}

      {error ? (
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
            isDisabled={isBusy}
            onPress={retry}
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
          onChangeText={setDraft}
          onSubmitEditing={send}
          placeholder="무엇이든 물어보세요"
          returnKeyType="send"
          testID="chat-input"
          value={draft}
        />
      </TextField>

      <Button
        accessibilityLabel={chatLabels.send}
        isDisabled={isBusy || draft.trim().length === 0}
        onPress={send}
        testID="chat-send"
      >
        {isBusy ? <Spinner size="sm" /> : null}
        <Button.Label>보내기</Button.Label>
      </Button>
    </ScrollView>
  );
}
