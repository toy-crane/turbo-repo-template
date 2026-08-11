import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import type { Session } from "@supabase/supabase-js";

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

// The screen only forwards the measured header height, and there is no real
// navigator in this test to measure one.
jest.mock("expo-router/react-navigation", () => ({
  useHeaderHeight: () => 64,
}));

// The screen owns the session and hands it to the panel, so the panel is
// stood in for and the test watches which object it receives.
jest.mock("@/features/chat/ui/chat-panel", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    ChatPanel: ({
      chat,
      ...props
    }: {
      chat: { tag?: string };
      topInset?: number;
    }) =>
      React.createElement(View, {
        accessibilityLabel: `chat panel with ${chat.tag ?? "unknown session"}`,
        testID: "chat-panel",
        ...props,
      }),
  };
});

const mockUseAuthSession = jest.mocked(useAuthSession);
const mockUseChatSession = jest.mocked(useChatSession);

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
});

afterEach(() => {
  jest.clearAllMocks();
});

test("현재 세션의 access token으로 채팅 세션을 만들어 패널에 넘긴다", async () => {
  const { getByLabelText, getByTestId } = await renderWithHeroUI(
    <ChatScreen />
  );

  expect(mockUseChatSession).toHaveBeenCalledWith("test-access-token");
  expect(getByLabelText("chat panel with chat-session")).toBeOnTheScreen();
  expect(getByTestId("chat-panel").props.topInset).toBeUndefined();
});

test("세션이 사라지면 채팅에 토큰을 넘기지 않는다", async () => {
  const view = await renderWithHeroUI(<ChatScreen />);

  mockUseAuthSession.mockReturnValue({ session: null, status: "signedOut" });
  await view.rerender(<ChatScreen />);

  expect(mockUseChatSession).toHaveBeenLastCalledWith(undefined);
});
