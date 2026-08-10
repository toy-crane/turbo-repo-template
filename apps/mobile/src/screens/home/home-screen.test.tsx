import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import type { Session } from "@supabase/supabase-js";

import { useAuthSession } from "@/features/auth/state/auth-session";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { HomeScreen } from "./home-screen";

jest.mock("@/features/auth/state/auth-session", () => ({
  useAuthSession: jest.fn(),
}));

// Home only decides what the chat is given, so the panel is stood in for.
jest.mock("@/features/chat/ui/chat-panel", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    ChatPanel: ({ accessToken }: { accessToken: string | undefined }) =>
      React.createElement(View, {
        accessibilityLabel: `chat with ${accessToken ?? "no token"}`,
      }),
  };
});

const mockUseAuthSession = jest.mocked(useAuthSession);

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
});

afterEach(() => {
  jest.clearAllMocks();
});

test("현재 세션의 access token으로 채팅을 연다", async () => {
  const { getByLabelText } = await renderWithHeroUI(<HomeScreen />);

  expect(getByLabelText("chat with test-access-token")).toBeOnTheScreen();
});

test("세션이 사라지면 채팅에 토큰을 넘기지 않는다", async () => {
  const view = await renderWithHeroUI(<HomeScreen />);

  mockUseAuthSession.mockReturnValue({ session: null, status: "signedOut" });
  await view.rerender(<HomeScreen />);

  expect(view.getByLabelText("chat with no token")).toBeOnTheScreen();
});
