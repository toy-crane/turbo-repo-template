import { useChat } from "@ai-sdk/react";
import type { ChatStatus, UIMessage } from "ai";
import { useCallback, useMemo, useRef, useState } from "react";

import { createChatTransport } from "@/features/chat/api/chat-transport";

/** Which request is in flight. Also what blocks a second one. */
type ChatAction = "retry" | "send";

/**
 * How often streaming updates reach React, in milliseconds. Low enough to
 * read as live typing, high enough that a long answer does not re-render the
 * screen on every token.
 */
const STREAM_UPDATE_INTERVAL_MS = 50;

function textOfMessage(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

export interface ChatSession {
  /** Leaves editing and puts the pre-edit draft back. */
  cancelEdit: () => void;
  /** False while there is no token to send, so a retry cannot go out naked. */
  canRetry: boolean;
  /** Empties the conversation in memory. The server is never told. */
  clearConversation: () => void;
  draft: string;
  /** True while the composer holds the last user message for rewriting. */
  editing: boolean;
  error: Error | undefined;
  isBusy: boolean;
  messages: UIMessage[];
  /** Requests a fresh answer for the last user message. `ready` only. */
  regenerateLast: () => void;
  retry: () => void;
  send: () => void;
  setDraft: (value: string) => void;
  /** Puts the last user message into the composer for editing. */
  startEdit: () => void;
  /** The AI SDK's own request state: submitted, streaming, ready or error. */
  status: ChatStatus;
  /** Stops the current generation and keeps whatever has arrived so far. */
  stop: () => void;
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
  const [editing, setEditing] = useState(false);

  // What the person had typed before pressing edit, so cancel can restore it.
  const draftBeforeEdit = useRef("");

  // The transport reads this on every send, so it has to see the token the app
  // holds now rather than the one captured when the screen mounted.
  const currentToken = useRef(accessToken);

  currentToken.current = accessToken;

  const transport = useMemo(
    () => createChatTransport(() => currentToken.current),
    []
  );
  const {
    error,
    messages,
    regenerate,
    sendMessage,
    setMessages,
    status,
    stop: stopChat,
  } = useChat({
    throttle: STREAM_UPDATE_INTERVAL_MS,
    transport,
  });

  const isBusy = status === "streaming" || status === "submitted";
  const running = useRef<ChatAction | undefined>(undefined);

  // Read through a ref where a callback only needs the list at call time:
  // depending on `messages` directly would recreate the callback on every
  // streamed chunk and drag the rows holding it into every re-render.
  const messagesRef = useRef(messages);

  messagesRef.current = messages;

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

      // Confirming an edit replaces the last user message: everything from
      // that message on is dropped, and the rewritten text goes out as the
      // new tail. One conversation, no leftover branch.
      if (editing) {
        setEditing(false);
        setMessages((current) => {
          const lastUserIndex = current.findLastIndex(
            (message) => message.role === "user"
          );

          return lastUserIndex < 0 ? current : current.slice(0, lastUserIndex);
        });
      }

      return sendMessage({ text });
    });
  }, [draft, editing, isBusy, run, sendMessage, setMessages]);

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

  const stop = useCallback(() => {
    // Only a running generation can be stopped; the AI SDK keeps the parts
    // that already arrived and puts the chat back into `ready`.
    if (!isBusy) {
      return;
    }

    stopChat();
  }, [isBusy, stopChat]);

  const startEdit = useCallback(() => {
    const lastUser = messagesRef.current.findLast(
      (message) => message.role === "user"
    );

    if (!lastUser || isBusy || editing) {
      return;
    }

    draftBeforeEdit.current = draft;
    setDraft(textOfMessage(lastUser));
    setEditing(true);
  }, [draft, editing, isBusy]);

  const cancelEdit = useCallback(() => {
    if (!editing) {
      return;
    }

    setEditing(false);
    setDraft(draftBeforeEdit.current);
  }, [editing]);

  const regenerateLast = useCallback(() => {
    // `ready` only: an error retry is the retry button's job, and a running
    // generation cannot be regenerated.
    if (status !== "ready" || !currentToken.current) {
      return;
    }

    run("retry", () => regenerate());
  }, [regenerate, run, status]);

  const clearConversation = useCallback(() => {
    if (isBusy) {
      return;
    }

    setMessages([]);
    setDraft("");
    setEditing(false);
  }, [isBusy, setMessages]);

  return {
    cancelEdit,
    canRetry: !(isBusy || accessToken === undefined),
    clearConversation,
    draft,
    editing,
    error,
    isBusy,
    messages,
    regenerateLast,
    retry,
    send,
    setDraft,
    startEdit,
    status,
    stop,
  };
}
