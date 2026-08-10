import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useCallback, useMemo, useRef, useState } from "react";

import { createChatTransport } from "@/features/chat/api/chat-transport";

/** Which request is in flight. Also what blocks a second one. */
type ChatAction = "retry" | "send";

export interface ChatSession {
  /** False while there is no token to send, so a retry cannot go out naked. */
  canRetry: boolean;
  draft: string;
  error: Error | undefined;
  isBusy: boolean;
  messages: UIMessage[];
  retry: () => void;
  send: () => void;
  setDraft: (value: string) => void;
}

/**
 * One conversation, held in memory for as long as the screen is on.
 *
 * The access token arrives from whoever assembled the screen rather than from
 * the auth feature: a feature does not read another feature's state, and the
 * transport has to see the token that is current at send time anyway.
 */
export function useChatSession(accessToken: string | undefined): ChatSession {
  const [draft, setDraft] = useState("");

  // The transport reads this on every send, so it has to see the token the app
  // holds now rather than the one captured when the screen mounted.
  const currentToken = useRef(accessToken);

  currentToken.current = accessToken;

  const transport = useMemo(
    () => createChatTransport(() => currentToken.current),
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

    // No token means no request. Getting the person to a sign-in screen is the
    // auth implementation's job, not this one's.
    if (!(text && currentToken.current) || isBusy) {
      return;
    }

    run("send", () => {
      setDraft("");

      return sendMessage({ text });
    });
  }, [draft, isBusy, run, sendMessage]);

  const retry = useCallback(() => {
    // The same check `send` makes. Without it a retry pressed after the session
    // went away sends a request with no Authorization header, and the 401 comes
    // back as the same "try again later" message the person is already looking
    // at.
    if (!currentToken.current || isBusy) {
      return;
    }

    run("retry", () => regenerate());
  }, [isBusy, regenerate, run]);

  return {
    canRetry: !(isBusy || accessToken === undefined),
    draft,
    error,
    isBusy,
    messages,
    retry,
    send,
    setDraft,
  };
}
