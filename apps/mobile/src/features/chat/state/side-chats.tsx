import { Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createSideChatTransport } from "@/features/chat/api/chat-transport";
import type { ChatDrafts } from "./use-chat-session";

export interface SideChat {
  /**
   * The conversation itself, kept outside React on purpose: the sheet showing
   * it comes and goes, and an answer already on its way has to carry on
   * without it.
   */
  chat: Chat<UIMessage>;
  /** True once the first question has gone. Until then nothing counts it. */
  hasAsked: boolean;
  id: string;
  /**
   * The newest thing said in it, as it was written. It is what tells two side
   * chats from similar phrases apart in the list that reopens them, so it is
   * kept up to date whether or not the sheet showing it is open.
   */
  lastText: string;
  /** The words that were selected, shown read-only as the side chat's source. */
  phrase: string;
  /**
   * The parent conversation up to and including the answer the phrase came
   * from, as it read at that moment. Only ever read: every request sends it in
   * front of the side chat's own messages, and nothing here writes it back.
   */
  snapshot: UIMessage[];
  /** The parent answer the phrase was selected in. */
  sourceMessageId: string;
}

interface SideChatsValue {
  /** The ones that have asked something, newest first. */
  askedChats: SideChat[];
  /** Every side chat in memory, newest first, the unasked one included. */
  chats: SideChat[];
  /** Throws away a side chat that closed before asking anything. */
  discardUnasked: (id: string) => void;
  /** Drops every side chat whose source answer left the parent conversation. */
  dropChatsWithoutSource: (parentMessages: UIMessage[]) => void;
  /** Counts this side chat from now on: its first question has gone. */
  markAsked: (id: string) => void;
  /** Takes down the newest thing said, for the list that reopens it. */
  rememberLastText: (id: string, messages: UIMessage[]) => void;
  /** Opens a side chat for a selected phrase and answers with its id. */
  startSideChat: (input: {
    phrase: string;
    snapshot: UIMessage[];
    sourceMessageId: string;
  }) => string;
}

interface DraftState {
  draft: string;
  editingMessageId: string | undefined;
}

interface SideChatDraftsValue {
  setDraft: (id: string, value: string) => void;
  setEditingMessageId: (id: string, value: string | undefined) => void;
  /**
   * Mutated in place rather than kept in state: nothing on screen reads the
   * stashed words until an edit is cancelled, and that already redraws.
   */
  stashedDrafts: Map<string, { current: string }>;
  states: Record<string, DraftState>;
}

const EMPTY_DRAFT: DraftState = { draft: "", editingMessageId: undefined };

const NO_SIDE_CHATS: SideChatsValue = {
  askedChats: [],
  chats: [],
  discardUnasked: () => undefined,
  dropChatsWithoutSource: () => undefined,
  markAsked: () => undefined,
  rememberLastText: () => undefined,
  startSideChat: () => "",
};

/**
 * The newest message that actually says something.
 *
 * An answer just starting is an empty message, and the list that reopens a
 * side chat would read as blank until the first character landed. What was
 * said before it is the truer answer to "how far has this one gone".
 */
function lastSpokenText(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const text = messages[index].parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  return "";
}

/**
 * The list and its actions. It changes when a side chat opens, asks or goes,
 * which is exactly when the count above the parent composer changes.
 */
const SideChatsContext = createContext<SideChatsValue>(NO_SIDE_CHATS);
/**
 * What is being typed in each side chat. Kept apart from the list so that a
 * keystroke in the sheet does not redraw the conversation behind it.
 */
const SideChatDraftsContext = createContext<SideChatDraftsValue>({
  setDraft: () => undefined,
  setEditingMessageId: () => undefined,
  stashedDrafts: new Map(),
  states: {},
});

/**
 * Every side chat this conversation holds, for as long as it holds it.
 *
 * The provider sits above both the conversation and the sheet, so a side chat
 * outlives the sheet that shows it and dies with the conversation it came
 * from. Nothing is written down anywhere else: leaving the conversation,
 * signing out or the app ending takes them all.
 */
export function SideChatsProvider({
  accessToken,
  children,
}: {
  accessToken: string | undefined;
  children: ReactNode;
}) {
  const [chats, setChats] = useState<SideChat[]>([]);
  const [states, setStates] = useState<Record<string, DraftState>>({});
  const chatsRef = useRef<SideChat[]>([]);
  const stashedDrafts = useRef(new Map<string, { current: string }>()).current;
  const nextId = useRef(0);
  // The transports read the token when they send, so a refreshed session
  // reaches a side chat opened long before it.
  const currentToken = useRef(accessToken);

  chatsRef.current = chats;
  currentToken.current = accessToken;

  const forget = useCallback(
    (going: SideChat[]) => {
      const dropped = new Set(going.map((sideChat) => sideChat.id));

      for (const sideChat of going) {
        sideChat.chat.stop().catch(() => {
          // The side chat is going either way, and a request that refuses to
          // stop is dropped with it.
        });
        stashedDrafts.delete(sideChat.id);
      }

      setChats((current) =>
        current.filter((sideChat) => !dropped.has(sideChat.id))
      );
      setStates((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([id]) => !dropped.has(id))
        )
      );
    },
    [stashedDrafts]
  );

  const rememberLastText = useCallback((id: string, messages: UIMessage[]) => {
    const lastText = lastSpokenText(messages);

    setChats((current) =>
      current.some(
        (sideChat) => sideChat.id === id && sideChat.lastText !== lastText
      )
        ? current.map((sideChat) =>
            sideChat.id === id ? { ...sideChat, lastText } : sideChat
          )
        : current
    );
  }, []);

  const startSideChat = useCallback<SideChatsValue["startSideChat"]>(
    ({ phrase, snapshot, sourceMessageId }) => {
      nextId.current += 1;
      const id = `side-chat-${nextId.current}`;
      const sideChat: SideChat = {
        chat: new Chat<UIMessage>({
          id,
          // The sheet is not there to notice an answer that lands while it is
          // closed, so the chat itself reports the finished answer back.
          onFinish: ({ messages }) => rememberLastText(id, messages),
          transport: createSideChatTransport(
            () => currentToken.current,
            snapshot
          ),
        }),
        hasAsked: false,
        id,
        lastText: "",
        phrase,
        snapshot,
        sourceMessageId,
      };

      setChats((current) => [sideChat, ...current]);

      return id;
    },
    [rememberLastText]
  );

  const markAsked = useCallback((id: string) => {
    setChats((current) =>
      current.some((sideChat) => sideChat.id === id && !sideChat.hasAsked)
        ? current.map((sideChat) =>
            sideChat.id === id ? { ...sideChat, hasAsked: true } : sideChat
          )
        : current
    );
  }, []);

  const discardUnasked = useCallback(
    (id: string) => {
      const unasked = chatsRef.current.filter(
        (sideChat) => sideChat.id === id && !sideChat.hasAsked
      );

      if (unasked.length > 0) {
        forget(unasked);
      }
    },
    [forget]
  );

  const dropChatsWithoutSource = useCallback(
    (parentMessages: UIMessage[]) => {
      const present = new Set(parentMessages.map((message) => message.id));
      const orphaned = chatsRef.current.filter(
        (sideChat) => !present.has(sideChat.sourceMessageId)
      );

      if (orphaned.length > 0) {
        forget(orphaned);
      }
    },
    [forget]
  );

  // Leaving the conversation ends every answer still arriving in it. Without
  // this the requests would run on with nothing left to receive them.
  useEffect(
    () => () => {
      for (const sideChat of chatsRef.current) {
        sideChat.chat.stop().catch(() => {
          // Nothing is left to show a failure to.
        });
      }
    },
    []
  );

  const setDraft = useCallback((id: string, value: string) => {
    setStates((current) => ({
      ...current,
      [id]: { ...(current[id] ?? EMPTY_DRAFT), draft: value },
    }));
  }, []);

  const setEditingMessageId = useCallback(
    (id: string, value: string | undefined) => {
      setStates((current) => ({
        ...current,
        [id]: { ...(current[id] ?? EMPTY_DRAFT), editingMessageId: value },
      }));
    },
    []
  );

  const list = useMemo<SideChatsValue>(
    () => ({
      askedChats: chats.filter((sideChat) => sideChat.hasAsked),
      chats,
      discardUnasked,
      dropChatsWithoutSource,
      markAsked,
      rememberLastText,
      startSideChat,
    }),
    [
      chats,
      discardUnasked,
      dropChatsWithoutSource,
      markAsked,
      rememberLastText,
      startSideChat,
    ]
  );
  const drafts = useMemo<SideChatDraftsValue>(
    () => ({ setDraft, setEditingMessageId, stashedDrafts, states }),
    [setDraft, setEditingMessageId, stashedDrafts, states]
  );

  return (
    <SideChatsContext.Provider value={list}>
      <SideChatDraftsContext.Provider value={drafts}>
        {children}
      </SideChatDraftsContext.Provider>
    </SideChatsContext.Provider>
  );
}

/** The side chats of the conversation this screen belongs to. */
export function useSideChats(): SideChatsValue {
  return useContext(SideChatsContext);
}

/** What is being typed in one side chat, kept above the sheet showing it. */
export function useSideChatDrafts(id: string): ChatDrafts {
  const { setDraft, setEditingMessageId, stashedDrafts, states } = useContext(
    SideChatDraftsContext
  );
  const state = states[id] ?? EMPTY_DRAFT;
  let stashedDraft = stashedDrafts.get(id);

  if (!stashedDraft) {
    stashedDraft = { current: "" };
    stashedDrafts.set(id, stashedDraft);
  }

  const stashed = stashedDraft;
  const setThisDraft = useCallback(
    (value: string) => setDraft(id, value),
    [id, setDraft]
  );
  const setThisEditingMessageId = useCallback(
    (value: string | undefined) => setEditingMessageId(id, value),
    [id, setEditingMessageId]
  );

  return useMemo(
    () => ({
      draft: state.draft,
      editingMessageId: state.editingMessageId,
      setDraft: setThisDraft,
      setEditingMessageId: setThisEditingMessageId,
      stashedDraft: stashed,
    }),
    [
      setThisDraft,
      setThisEditingMessageId,
      stashed,
      state.draft,
      state.editingMessageId,
    ]
  );
}
