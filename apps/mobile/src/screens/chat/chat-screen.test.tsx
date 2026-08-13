import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import type { Session } from "@supabase/supabase-js";
import { useNavigation } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";

import { useAuthSession } from "@/features/auth/state/auth-session";
import { useChatSession } from "@/features/chat/state/use-chat-session";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { ChatScreen } from "./chat-screen";

jest.mock("@/features/auth/state/auth-session", () => ({
  useAuthSession: jest.fn(),
}));

jest.mock("@/features/chat/state/use-chat-session", () => ({
  useChatSession: jest.fn(),
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

// The screen owns the session and hands it to the panel, so the panel is
// stood in for and the test watches which object it receives.
jest.mock("@/features/chat/ui/chat-panel", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    ChatPanel: ({
      chat,
      inputRef,
      topInset,
    }: {
      chat: { tag?: string };
      inputRef?: unknown;
      topInset?: number;
    }) =>
      React.createElement(
        View,
        {
          accessibilityLabel: `chat panel with ${chat.tag ?? "unknown session"}`,
        },
        React.createElement(View, {
          accessibilityLabel: `top inset ${topInset ?? 0}`,
        }),
        React.createElement(View, {
          accessibilityLabel: `input ref ${typeof inputRef}`,
        })
      ),
  };
});

const mockUseAuthSession = jest.mocked(useAuthSession);
const mockUseChatSession = jest.mocked(useChatSession);
const mockUseHeaderHeight = jest.mocked(useHeaderHeight);
const mockUseNavigation = jest.mocked(useNavigation);

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

const chatSessionStub = { tag: "chat-session" } as unknown as ReturnType<
  typeof useChatSession
>;

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
  mockUseAuthSession.mockReturnValue({
    session: session("test-access-token"),
    status: "signedIn",
  });
  mockUseChatSession.mockReturnValue(chatSessionStub);
  mockUseHeaderHeight.mockReturnValue(116);
  stubNavigation();
});

afterEach(() => {
  jest.clearAllMocks();
});

test("화면이 도착하면 입력창을 잡을 ref를 패널에 넘긴다", async () => {
  const { getByLabelText } = await renderWithHeroUI(<ChatScreen />);

  expect(getByLabelText("input ref function")).toBeOnTheScreen();
});

test("현재 세션의 access token으로 채팅 세션을 만들어 패널에 넘긴다", async () => {
  const { getByLabelText } = await renderWithHeroUI(<ChatScreen />);

  expect(mockUseChatSession).toHaveBeenCalledWith("test-access-token");
  expect(getByLabelText("chat panel with chat-session")).toBeOnTheScreen();
});

test("투명한 iOS 헤더 높이를 패널의 위쪽 여백으로 넘긴다", async () => {
  const { getByLabelText } = await renderWithHeroUI(<ChatScreen />);

  expect(getByLabelText("top inset 116")).toBeOnTheScreen();
});

test("세션이 사라지면 채팅에 토큰을 넘기지 않는다", async () => {
  const view = await renderWithHeroUI(<ChatScreen />);

  mockUseAuthSession.mockReturnValue({ session: null, status: "signedOut" });
  await view.rerender(<ChatScreen />);

  expect(mockUseChatSession).toHaveBeenLastCalledWith(undefined);
});
