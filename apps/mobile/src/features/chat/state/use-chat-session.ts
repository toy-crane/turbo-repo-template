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
  /** Leaves inline editing without changing the conversation. */
  cancelEdit: () => void;
  /** False without a token, during a request, or while inline editing. */
  canRetry: boolean;
  /** True when the current composer draft can start a new request. */
  canSend: boolean;
  /** Sends the inline edit after replacing the selected conversation tail. */
  confirmEdit: () => void;
  draft: string;
  /** The inline editor. Its draft never shares state with the composer. */
  editing: { draft: string; messageId: string } | undefined;
  error: Error | undefined;
  isBusy: boolean;
  messages: UIMessage[];
  /** Requests a fresh answer for the last user message. `ready` only. */
  regenerateLast: () => void;
  retry: () => void;
  send: () => void;
  setDraft: (value: string) => void;
  setEditDraft: (value: string) => void;
  /** Opens the selected user message in its own inline editor. */
  startEdit: (messageId: string) => void;
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
  const [editing, setEditing] = useState<ChatSession["editing"]>(undefined);
  const [stopRequested, setStopRequested] = useState(false);
  const stopRequestedRef = useRef(false);

  // A request that threw before it reached the chat store, so the screen has
  // something to show instead of a button that quietly does nothing.
  const [requestError, setRequestError] = useState<Error | undefined>(
    undefined
  );

  // The transport reads this on every send, so it has to see the token the app
  // holds now rather than the one captured when the screen mounted.
  const currentToken = useRef(accessToken);

  currentToken.current = accessToken;

  const transport = useMemo(
    () => createChatTransport(() => currentToken.current),
    []
  );

  // The conversation as it stood before a regenerate dropped the answer it is
  // about to replace. Set only while such a request is in flight.
  const beforeRegenerate = useRef<UIMessage[] | undefined>(undefined);
  const {
    error,
    messages,
    regenerate,
    sendMessage,
    setMessages,
    status,
    stop: stopChat,
  } = useChat({
    // Failing does not reject the promise the request returned — the AI SDK
    // turns it into chat state — so putting the dropped answer back has to
    // happen here.
    onError: () => {
      if (beforeRegenerate.current !== undefined) {
        setMessagesRef.current?.(beforeRegenerate.current);
        beforeRegenerate.current = undefined;
      }
    },
    throttle: STREAM_UPDATE_INTERVAL_MS,
    transport,
  });

  // `onError` is built before `setMessages` exists, so it reaches it through
  // a ref rather than capturing an undefined binding.
  const setMessagesRef = useRef<typeof setMessages | undefined>(undefined);

  setMessagesRef.current = setMessages;

  const sdkIsBusy = status === "streaming" || status === "submitted";
  const isBusy = sdkIsBusy && !stopRequested;
  const canSend = Boolean(
    draft.trim() && accessToken && !sdkIsBusy && editing === undefined
  );
  const canRetry = Boolean(accessToken && !sdkIsBusy && editing === undefined);
  const running = useRef<ChatAction | undefined>(undefined);
  const requestGeneration = useRef(0);

  // Read through a ref where a callback only needs the value at call time.
  //
  // Two reasons. Depending on `messages` directly would recreate the callback
  // on every streamed chunk and drag the rows holding it into every
  // re-render. And the virtual list caches a row until its own item or the
  // list's `extraData` changes, so a callback that changes with the draft
  // would leave every row holding a stale one — the draft cannot go into
  // `extraData` without re-rendering the whole conversation on each keystroke.
  const messagesRef = useRef(messages);
  const editingRef = useRef(editing);

  messagesRef.current = messages;
  editingRef.current = editing;

  /**
   * One entry point for both requests this screen can start.
   *
   * The ref, not the status, is what stops a double tap: two presses in the
   * same frame both read the status from before the first one, so a status
   * check alone would let the second through and send the message twice.
   *
   * A rejection has to land somewhere the screen can show. `sendMessage`
   * turns a failed request into chat state on its own, but `regenerate`
   * throws before the request starts, and an unhandled rejection is a LogBox
   * warning in development and nothing at all in release.
   */
  const run = useCallback((action: ChatAction, work: () => Promise<void>) => {
    if (running.current !== undefined) {
      return;
    }

    const generation = requestGeneration.current + 1;

    requestGeneration.current = generation;
    running.current = action;
    stopRequestedRef.current = false;
    setStopRequested(false);
    setRequestError(undefined);
    work()
      .catch((cause: unknown) => {
        setRequestError(
          cause instanceof Error ? cause : new Error(String(cause))
        );
      })
      .finally(() => {
        if (requestGeneration.current === generation) {
          running.current = undefined;
        }
      });
  }, []);

  const send = useCallback(() => {
    const text = draft.trim();

    // No token means no request. Getting the person to a sign-in screen is the
    // auth implementation's job, not this one's.
    if (!(canSend && currentToken.current) || editingRef.current) {
      return;
    }

    run("send", () => {
      setDraft("");

      return sendMessage({ text });
    });
  }, [canSend, draft, run, sendMessage]);

  const retry = useCallback(() => {
    // The same check `send` makes. Without it a retry pressed after the session
    // went away sends a request with no Authorization header, and the 401 comes
    // back as the same "try again later" message the person is already looking
    // at.
    if (!currentToken.current || sdkIsBusy || editingRef.current) {
      return;
    }

    run("retry", () => regenerate());
  }, [regenerate, run, sdkIsBusy]);

  const stop = useCallback(() => {
    // Only a running generation can be stopped; the AI SDK keeps the parts
    // that already arrived and puts the chat back into `ready`.
    if (!isBusy || stopRequestedRef.current) {
      return;
    }

    stopRequestedRef.current = true;
    setRequestError(undefined);
    setStopRequested(true);
    stopChat();
  }, [isBusy, stopChat]);

  // Rows keep this callback while the virtual list caches them, so every value
  // that can change between presses is read through a ref.
  const startEdit = useCallback(
    (messageId: string) => {
      const selected = messagesRef.current.find(
        (message) => message.id === messageId && message.role === "user"
      );

      if (!selected || isBusy || editingRef.current) {
        return;
      }

      setEditing({ draft: textOfMessage(selected), messageId });
    },
    [isBusy]
  );

  const setEditDraft = useCallback((value: string) => {
    setEditing((current) =>
      current ? { ...current, draft: value } : undefined
    );
  }, []);

  const cancelEdit = useCallback(() => {
    setEditing(undefined);
  }, []);

  const confirmEdit = useCallback(() => {
    const currentEdit = editingRef.current;
    const text = currentEdit?.draft.trim() ?? "";

    if (!(currentEdit && text && currentToken.current) || isBusy) {
      return;
    }

    const selectedIndex = messagesRef.current.findIndex(
      (message) =>
        message.id === currentEdit.messageId && message.role === "user"
    );

    if (selectedIndex < 0) {
      return;
    }

    run("send", () => {
      setEditing(undefined);
      setMessages((current) => {
        const index = current.findIndex(
          (message) =>
            message.id === currentEdit.messageId && message.role === "user"
        );

        return index < 0 ? current : current.slice(0, index);
      });

      return sendMessage({ text });
    });
  }, [isBusy, run, sendMessage, setMessages]);

  const regenerateLast = useCallback(() => {
    // `ready` only: an error retry is the retry button's job, and a running
    // generation cannot be regenerated.
    if (status !== "ready" || !currentToken.current || editingRef.current) {
      return;
    }

    // Name the message. Without an id the AI SDK regenerates whatever sits
    // last in the list whatever its role, so a conversation whose tail is a
    // user message (send, then stop before the first chunk) would answer that
    // message instead of remaking the answer this button belongs to.
    const lastAssistant = messagesRef.current.findLast(
      (message) => message.role === "assistant"
    );

    if (!lastAssistant) {
      return;
    }

    // The AI SDK drops the message being remade before it sends anything, so
    // a failed request would take a stopped answer's text with it and leave
    // no way back. `onError` puts this back.
    beforeRegenerate.current = messagesRef.current;

    run("retry", () =>
      regenerate({ messageId: lastAssistant.id }).finally(() => {
        beforeRegenerate.current = undefined;
      })
    );
  }, [regenerate, run, status]);

  return {
    cancelEdit,
    canRetry,
    canSend,
    confirmEdit,
    draft,
    editing,
    error: stopRequested ? undefined : (error ?? requestError),
    isBusy,
    messages,
    regenerateLast,
    retry,
    send,
    setDraft,
    setEditDraft,
    startEdit,
    status: stopRequested && sdkIsBusy ? "ready" : status,
    stop,
  };
}
