import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { act, screen } from "@testing-library/react-native";
import { useNavigation } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";

import { useAuthSession } from "@/features/auth/state/auth-session";
import { type SideChat, useSideChats } from "@/features/chat/state/side-chats";
import type { ChatSession } from "@/features/chat/state/use-chat-session";
import { useSideChatSession } from "@/features/chat/state/use-side-chat-session";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { SideChatScreen } from "./side-chat-screen";

jest.mock("@/features/auth/state/auth-session", () => ({
  useAuthSession: jest.fn(),
}));

jest.mock("@/features/chat/state/side-chats", () => ({
  useSideChats: jest.fn(),
}));

jest.mock("@/features/chat/state/use-side-chat-session", () => ({
  useSideChatSession: jest.fn(),
}));

jest.mock("expo-router", () => ({
  ...(jest.requireActual("expo-router") as object),
  useNavigation: jest.fn(),
}));

jest.mock("expo-router/react-navigation", () => ({
  useHeaderHeight: jest.fn(),
}));

interface PanelProps {
  chat: { tag?: string };
  onAskInSideChat?: unknown;
  source?: string;
  topInset?: number;
}

let panel: PanelProps | undefined;

jest.mock("@/features/chat/ui/chat-panel", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    ChatPanel: (props: PanelProps) => {
      panel = props;

      return React.createElement(View, { testID: "side-chat-panel" });
    },
  };
});

const mockUseAuthSession = jest.mocked(useAuthSession);
const mockUseHeaderHeight = jest.mocked(useHeaderHeight);
const mockUseNavigation = jest.mocked(useNavigation);
const mockUseSideChats = jest.mocked(useSideChats);
const mockUseSideChatSession = jest.mocked(useSideChatSession);

const discardUnasked = jest.fn();
const onMissing = jest.fn();

function sideChat(id: string, phrase: string): SideChat {
  return {
    chat: {} as SideChat["chat"],
    hasAsked: true,
    id,
    lastText: "",
    phrase,
    snapshot: [],
    sourceMessageId: "assistant-1",
  };
}

function stubStore(chats: SideChat[]) {
  mockUseSideChats.mockReturnValue({
    askedChats: chats,
    chats,
    discardUnasked,
    dropChatsWithoutSource: jest.fn(),
    markAsked: jest.fn(),
    rememberLastText: jest.fn(),
    startSideChat: jest.fn(() => ""),
  });
}

beforeEach(() => {
  panel = undefined;
  mockUseAuthSession.mockReturnValue({ session: null, status: "signedIn" });
  mockUseHeaderHeight.mockReturnValue(64);
  mockUseNavigation.mockReturnValue({ addListener: () => () => undefined });
  mockUseSideChatSession.mockReturnValue({
    tag: "side-chat-session",
  } as unknown as ChatSession);
  stubStore([sideChat("side-chat-1", "이어받은 구절")]);
});

afterEach(() => {
  jest.clearAllMocks();
});

test("고른 구절을 출처로 두고 그 Side chat의 대화를 보여 준다", async () => {
  await renderWithHeroUI(
    <SideChatScreen id="side-chat-1" onMissing={onMissing} />
  );

  expect(screen.getByTestId("side-chat-panel")).toBeOnTheScreen();
  expect(panel?.source).toBe("이어받은 구절");
  expect(panel?.chat.tag).toBe("side-chat-session");
});

// Selecting part of an answer here still copies and looks up; what it cannot
// do is start another side chat.
test("Side chat 안에서는 또 다른 Side chat을 시작할 수 없다", async () => {
  await renderWithHeroUI(
    <SideChatScreen id="side-chat-1" onMissing={onMissing} />
  );

  expect(panel?.onAskInSideChat).toBeUndefined();
});

test("화면을 닫으면 아직 묻지 않은 Side chat을 버리라고 알린다", async () => {
  const { unmount } = await renderWithHeroUI(
    <SideChatScreen id="side-chat-1" onMissing={onMissing} />
  );

  expect(discardUnasked).not.toHaveBeenCalled();

  await act(() => {
    unmount();
  });

  expect(discardUnasked).toHaveBeenCalledWith("side-chat-1");
});

// Its source answer can be regenerated while the sheet is open, and what the
// side chat was reading is gone with it.
test("Side chat이 사라지면 아무것도 그리지 않고 화면을 닫는다", async () => {
  stubStore([]);

  await renderWithHeroUI(
    <SideChatScreen id="side-chat-1" onMissing={onMissing} />
  );

  expect(screen.queryByTestId("side-chat-panel")).not.toBeOnTheScreen();
  expect(onMissing).toHaveBeenCalledTimes(1);
});
