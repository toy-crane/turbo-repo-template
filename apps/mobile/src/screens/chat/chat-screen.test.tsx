import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import type { Session } from "@supabase/supabase-js";
import { act } from "@testing-library/react-native";
import type { UIMessage } from "ai";
import { useNavigation } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";

import { useAuthSession } from "@/features/auth/state/auth-session";
import { useSideChats } from "@/features/chat/state/side-chats";
import type { ChatSession } from "@/features/chat/state/use-chat-session";
import { useChatSession } from "@/features/chat/state/use-chat-session";
import type { SideChatEntry } from "@/features/chat/ui/chat-panel";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { ChatScreen } from "./chat-screen";

jest.mock("@/features/auth/state/auth-session", () => ({
  useAuthSession: jest.fn(),
}));

jest.mock("@/features/chat/state/use-chat-session", () => ({
  useChatSession: jest.fn(),
}));

jest.mock("@/features/chat/state/side-chats", () => ({
  useSideChats: jest.fn(),
}));

// Only the navigation object is stood in for; the rest of expo-router stays
// real so a later import from it does not silently become undefined here.
jest.mock("expo-router", () => ({
  ...(jest.requireActual("expo-router") as object),
  useNavigation: jest.fn(),
}));

jest.mock("expo-router/react-navigation", () => ({
  useHeaderHeight: jest.fn(),
}));

interface PanelProps {
  chat: { tag?: string };
  inputRef?: unknown;
  onAskInSideChat?: (input: { messageId: string; phrase: string }) => void;
  onOpenSideChat?: (id: string) => void;
  sideChats?: SideChatEntry[];
  topInset?: number;
}

let panel: PanelProps | undefined;

// The screen owns the session and hands it to the panel, so the panel is
// stood in for and the test watches what it receives.
jest.mock("@/features/chat/ui/chat-panel", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    ChatPanel: (props: PanelProps) => {
      panel = props;

      return React.createElement(
        View,
        {
          accessibilityLabel: `chat panel with ${props.chat.tag ?? "unknown session"}`,
        },
        React.createElement(View, {
          accessibilityLabel: `top inset ${props.topInset ?? 0}`,
        }),
        React.createElement(View, {
          accessibilityLabel: `input ref ${typeof props.inputRef}`,
        })
      );
    },
  };
});

const mockUseAuthSession = jest.mocked(useAuthSession);
const mockUseChatSession = jest.mocked(useChatSession);
const mockUseHeaderHeight = jest.mocked(useHeaderHeight);
const mockUseNavigation = jest.mocked(useNavigation);
const mockUseSideChats = jest.mocked(useSideChats);

const dropChatsWithoutSource = jest.fn();
const startSideChat = jest.fn(() => "side-chat-1");
const openSideChat = jest.fn();

/**
 * Stands in for the native stack. When the arrival lands and what it does to
 * the caret belong to the hook, and its own test covers them; here the screen
 * only has to hand the panel the ref that hook returns.
 */
function stubNavigation() {
  mockUseNavigation.mockReturnValue({
    addListener: () => () => undefined,
  });
}

function textMessage(
  id: string,
  role: "assistant" | "user",
  text: string
): UIMessage {
  return { id, parts: [{ text, type: "text" }], role };
}

const PARENT_MESSAGES = [
  textMessage("user-1", "user", "첫 질문"),
  textMessage("assistant-1", "assistant", "첫 답변"),
  textMessage("user-2", "user", "두 번째 질문"),
  textMessage("assistant-2", "assistant", "두 번째 답변"),
];

const chatSessionStub = {
  messages: PARENT_MESSAGES,
  tag: "chat-session",
} as unknown as ChatSession;

function stubSideChats(
  askedChats: ReturnType<typeof useSideChats>["askedChats"] = []
) {
  mockUseSideChats.mockReturnValue({
    askedChats,
    chats: askedChats,
    discardUnasked: jest.fn(),
    dropChatsWithoutSource,
    markAsked: jest.fn(),
    rememberLastText: jest.fn(),
    startSideChat,
  });
}

function askedChat(id: string, phrase: string, lastText: string) {
  return {
    chat: {} as ReturnType<typeof useSideChats>["chats"][number]["chat"],
    hasAsked: true,
    id,
    lastText,
    phrase,
    snapshot: [],
    sourceMessageId: "assistant-1",
  };
}

function session(accessToken: string): Session {
  return {
    access_token: accessToken,
    expires_in: 3600,
    refresh_token: "test-refresh-token",
    token_type: "bearer",
    user: {
      app_metadata: {},
      aud: "authenticated",
      created_at: "2026-01-01T00:00:00.000Z",
      id: "user-1",
      user_metadata: {},
    },
  } as Session;
}

beforeEach(() => {
  panel = undefined;
  mockUseAuthSession.mockReturnValue({
    session: session("test-access-token"),
    status: "signedIn",
  });
  mockUseChatSession.mockReturnValue(chatSessionStub);
  mockUseHeaderHeight.mockReturnValue(116);
  stubNavigation();
  stubSideChats();
});

afterEach(() => {
  jest.clearAllMocks();
});

test("화면이 도착하면 입력창을 잡을 ref를 패널에 넘긴다", async () => {
  const { getByLabelText } = await renderWithHeroUI(
    <ChatScreen onOpenSideChat={openSideChat} />
  );

  expect(getByLabelText("input ref function")).toBeOnTheScreen();
});

test("현재 세션의 access token으로 채팅 세션을 만들어 패널에 넘긴다", async () => {
  const { getByLabelText } = await renderWithHeroUI(
    <ChatScreen onOpenSideChat={openSideChat} />
  );

  expect(mockUseChatSession).toHaveBeenCalledWith("test-access-token");
  expect(getByLabelText("chat panel with chat-session")).toBeOnTheScreen();
});

test("투명한 iOS 헤더 높이를 패널의 위쪽 여백으로 넘긴다", async () => {
  const { getByLabelText } = await renderWithHeroUI(
    <ChatScreen onOpenSideChat={openSideChat} />
  );

  expect(getByLabelText("top inset 116")).toBeOnTheScreen();
});

test("세션이 사라지면 채팅에 토큰을 넘기지 않는다", async () => {
  const view = await renderWithHeroUI(
    <ChatScreen onOpenSideChat={openSideChat} />
  );

  mockUseAuthSession.mockReturnValue({ session: null, status: "signedOut" });
  await view.rerender(<ChatScreen onOpenSideChat={openSideChat} />);

  expect(mockUseChatSession).toHaveBeenLastCalledWith(undefined);
});

test("구절을 고르면 그 답변까지의 대화를 이어받은 Side chat을 열어 준다", async () => {
  await renderWithHeroUI(<ChatScreen onOpenSideChat={openSideChat} />);

  await act(() => {
    panel?.onAskInSideChat?.({
      messageId: "assistant-1",
      phrase: "첫 답변의 한 구절",
    });
  });

  expect(startSideChat).toHaveBeenCalledWith({
    phrase: "첫 답변의 한 구절",
    snapshot: PARENT_MESSAGES.slice(0, 2),
    sourceMessageId: "assistant-1",
  });
  expect(openSideChat).toHaveBeenCalledWith("side-chat-1");
});

test("대화에 없는 답변으로는 Side chat을 시작하지 않는다", async () => {
  await renderWithHeroUI(<ChatScreen onOpenSideChat={openSideChat} />);

  await act(() => {
    panel?.onAskInSideChat?.({ messageId: "사라진 답변", phrase: "구절" });
  });

  expect(startSideChat).not.toHaveBeenCalled();
  expect(openSideChat).not.toHaveBeenCalled();
});

test("다시 열기 목록에 구절과 Markdown 없는 마지막 말을 함께 넘긴다", async () => {
  stubSideChats([
    askedChat("side-chat-2", "뒤 구절", "## 제목\n**굵은** 답변"),
    askedChat("side-chat-1", "앞 구절", "짧은 답변"),
  ]);

  await renderWithHeroUI(<ChatScreen onOpenSideChat={openSideChat} />);

  expect(panel?.sideChats).toEqual([
    { id: "side-chat-2", lastLine: "제목 굵은 답변", phrase: "뒤 구절" },
    { id: "side-chat-1", lastLine: "짧은 답변", phrase: "앞 구절" },
  ]);
});

test("부모 대화가 바뀌면 출처가 사라진 Side chat을 정리하라고 알린다", async () => {
  await renderWithHeroUI(<ChatScreen onOpenSideChat={openSideChat} />);

  expect(dropChatsWithoutSource).toHaveBeenCalledWith(PARENT_MESSAGES);
});
