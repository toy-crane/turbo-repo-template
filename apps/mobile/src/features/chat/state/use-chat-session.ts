import { type UseChatHelpers, useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useCallback, useMemo, useRef, useState } from "react";

import { createChatTransport } from "@/features/chat/api/chat-transport";

/** How often a stream is let through to React, in milliseconds. */
export const STREAM_UPDATE_INTERVAL_MS = 50;

export interface ChatSession {
  /** Puts a message's own words in the composer to ask it again. */
  beginEdit: (messageId: string) => void;
  /** Leaves the conversation alone and gives the stashed draft back. */
  cancelEdit: () => void;
  draft: string;
  /** The message being rewritten, and with it everything from there on. */
  editingMessageId: string | undefined;
  error: Error | undefined;
  isBusy: boolean;
  messages: UIMessage[];
  /** Drops this answer and everything after it, then asks again. */
  regenerateAnswer: (messageId: string) => void;
  /** Sends the failed question again without the person retyping it. */
  retry: () => void;
  send: () => void;
  setDraft: (value: string) => void;
  /** Ends the answer where it is and keeps what already arrived. */
  stop: () => Promise<void>;
}

/**
 * Where a conversation keeps what has been typed but not sent.
 *
 * A conversation on a screen of its own keeps this in the screen, and it goes
 * when the screen does. A side chat keeps it above the sheet instead, so
 * closing the sheet leaves the half-written question and the edit in progress
 * where they were.
 */
export interface ChatDrafts {
  draft: string;
  editingMessageId: string | undefined;
  setDraft: (value: string) => void;
  setEditingMessageId: (value: string | undefined) => void;
  /** The words put aside while a message is being rewritten. */
  stashedDraft: { current: string };
}

function textOfMessage(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

/** Drafts that live and die with the screen holding them. */
export function useLocalChatDrafts(): ChatDrafts {
  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string>();
  const stashedDraft = useRef("");

  return useMemo(
    () => ({
      draft,
      editingMessageId,
      setDraft,
      setEditingMessageId,
      stashedDraft,
    }),
    [draft, editingMessageId]
  );
}

/**
 * What a conversation offers a screen, whichever chat is behind it.
 *
 * The chat itself and the drafts are handed in: the screen's own conversation
 * builds both here, and a side chat brings a chat that outlives its sheet and
 * drafts that are kept with it.
 */
export function useConversation(
  chat: UseChatHelpers<UIMessage>,
  drafts: ChatDrafts,
  accessToken: string | undefined
): ChatSession {
  const [requestError, setRequestError] = useState<Error | undefined>();
  const {
    draft,
    editingMessageId,
    setDraft,
    setEditingMessageId,
    stashedDraft,
  } = drafts;
  const currentToken = useRef(accessToken);
  // Read through a ref so that starting an edit does not have to be rebuilt on
  // every keystroke: it is handed to every message in the list, and a new one
  // each time would redraw them all while someone is typing.
  const currentDraft = useRef(draft);

  currentToken.current = accessToken;
  currentDraft.current = draft;

  const {
    clearError,
    error,
    messages,
    regenerate,
    sendMessage,
    setMessages,
    status,
    stop,
  } = chat;
  const isBusy = status === "submitted" || status === "streaming";
  const sending = useRef(false);

  // Every path that reaches the server reports the same way: a rejected
  // request becomes the one error the screen shows, and the guard against a
  // second request in the same frame is released either way.
  const runRequest = useCallback((request: Promise<void>) => {
    sending.current = true;
    setRequestError(undefined);

    request
      .catch((cause: unknown) => {
        setRequestError(
          cause instanceof Error ? cause : new Error(String(cause))
        );
      })
      .finally(() => {
        sending.current = false;
      });
  }, []);

  const canStartRequest = useCallback(
    () => Boolean(currentToken.current) && !(isBusy || sending.current),
    [isBusy]
  );

  const send = useCallback(() => {
    const text = draft.trim();

    if (!(text && canStartRequest())) {
      return;
    }

    setDraft("");

    // Sending from the edit state rewrites history first: the message being
    // edited and everything after it go, and the edited words arrive as a new
    // question. `setMessages` writes straight through to the chat store, so
    // the request below already carries the shortened conversation.
    if (editingMessageId) {
      const editedIndex = messages.findIndex(
        (message) => message.id === editingMessageId
      );

      if (editedIndex >= 0) {
        setMessages(messages.slice(0, editedIndex));
      }

      setEditingMessageId(undefined);
      stashedDraft.current = "";
    }

    runRequest(sendMessage({ text }));
  }, [
    canStartRequest,
    draft,
    editingMessageId,
    messages,
    runRequest,
    sendMessage,
    setDraft,
    setEditingMessageId,
    setMessages,
    stashedDraft,
  ]);

  const regenerateAnswer = useCallback(
    (messageId: string) => {
      if (!canStartRequest()) {
        return;
      }

      runRequest(regenerate({ messageId }));
    },
    [canStartRequest, regenerate, runRequest]
  );

  const retry = useCallback(() => {
    // With no message to regenerate the SDK throws, and a failed request that
    // never reached the list leaves exactly that.
    if (messages.length === 0 || !canStartRequest()) {
      return;
    }

    runRequest(regenerate());
  }, [canStartRequest, messages.length, regenerate, runRequest]);

  const beginEdit = useCallback(
    (messageId: string) => {
      const target = messages.find((message) => message.id === messageId);

      if (!target) {
        return;
      }

      // A failure from the last question goes with it. Leaving it up would
      // put "try again" beside the edit notice, and pressing it would restart
      // the conversation somewhere other than where the edit says it will.
      clearError();
      setRequestError(undefined);
      stashedDraft.current = currentDraft.current;
      setEditingMessageId(messageId);
      setDraft(textOfMessage(target));
    },
    [clearError, messages, setDraft, setEditingMessageId, stashedDraft]
  );

  const cancelEdit = useCallback(() => {
    setEditingMessageId(undefined);
    setDraft(stashedDraft.current);
    stashedDraft.current = "";
  }, [setDraft, setEditingMessageId, stashedDraft]);

  return {
    beginEdit,
    cancelEdit,
    draft,
    editingMessageId,
    error: error ?? requestError,
    isBusy,
    messages,
    regenerateAnswer,
    retry,
    send,
    setDraft,
    stop,
  };
}

/** One in-memory conversation for as long as the chat screen is mounted. */
export function useChatSession(accessToken: string | undefined): ChatSession {
  const currentToken = useRef(accessToken);

  currentToken.current = accessToken;

  const transport = useMemo(
    () => createChatTransport(() => currentToken.current),
    []
  );
  const chat = useChat({
    throttle: STREAM_UPDATE_INTERVAL_MS,
    transport,
  });
  const drafts = useLocalChatDrafts();

  return useConversation(chat, drafts, accessToken);
}
