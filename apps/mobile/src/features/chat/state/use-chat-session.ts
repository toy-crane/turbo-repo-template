import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useCallback, useMemo, useRef, useState } from "react";

import { createChatTransport } from "@/features/chat/api/chat-transport";

const STREAM_UPDATE_INTERVAL_MS = 50;

export interface ChatSession {
  draft: string;
  error: Error | undefined;
  isBusy: boolean;
  messages: UIMessage[];
  send: () => void;
  setDraft: (value: string) => void;
}

/** One in-memory conversation for as long as the chat screen is mounted. */
export function useChatSession(accessToken: string | undefined): ChatSession {
  const [draft, setDraft] = useState("");
  const [requestError, setRequestError] = useState<Error | undefined>();
  const currentToken = useRef(accessToken);

  currentToken.current = accessToken;

  const transport = useMemo(
    () => createChatTransport(() => currentToken.current),
    []
  );
  const { error, messages, sendMessage, status } = useChat({
    throttle: STREAM_UPDATE_INTERVAL_MS,
    transport,
  });
  const isBusy = status === "submitted" || status === "streaming";
  const sending = useRef(false);

  const send = useCallback(() => {
    const text = draft.trim();

    if (!(text && currentToken.current) || isBusy || sending.current) {
      return;
    }

    sending.current = true;
    setRequestError(undefined);
    setDraft("");

    sendMessage({ text })
      .catch((cause: unknown) => {
        setRequestError(
          cause instanceof Error ? cause : new Error(String(cause))
        );
      })
      .finally(() => {
        sending.current = false;
      });
  }, [draft, isBusy, sendMessage]);

  return {
    draft,
    error: error ?? requestError,
    isBusy,
    messages,
    send,
    setDraft,
  };
}
