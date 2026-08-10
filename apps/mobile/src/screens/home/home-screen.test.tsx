import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import type { Session } from "@supabase/supabase-js";
import { screen, userEvent } from "@testing-library/react-native";
import { Alert } from "react-native";

import { useAuthSession } from "@/features/auth/state/auth-session";
import { useChatSession } from "@/features/chat/state/use-chat-session";
import { chatLabels } from "@/features/chat/ui/chat-labels";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { HomeScreen } from "./home-screen";

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

// Outside a navigator the toolbar cannot reach a native header, so the stub
// renders its button as a plain pressable the test can press.
jest.mock("expo-router", () => {
  const React = require("react") as typeof import("react");
  const { Pressable, Text, View } =
    require("react-native") as typeof import("react-native");

  const Toolbar = Object.assign(
    ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children),
    {
      Button: ({
        accessibilityLabel,
        children,
        onPress,
      }: {
        accessibilityLabel?: string;
        children?: React.ReactNode;
        onPress?: () => void;
      }) =>
        React.createElement(
          Pressable,
          { accessibilityLabel, accessibilityRole: "button", onPress },
          children
        ),
      Icon: () => null,
      Label: ({ children }: { children?: React.ReactNode }) =>
        React.createElement(Text, null, children),
    }
  );

  return { Stack: { Toolbar } };
});

// Home only wires the session to the panel, so the panel is stood in for and
// the test watches which session object it receives.
jest.mock("@/features/chat/ui/chat-panel", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    ChatPanel: ({ chat }: { chat: { tag?: string } }) =>
      React.createElement(View, {
        accessibilityLabel: `chat panel with ${chat.tag ?? "unknown session"}`,
      }),
  };
});

const mockUseAuthSession = jest.mocked(useAuthSession);
const mockUseChatSession = jest.mocked(useChatSession);

function chatSessionStub(
  overrides: Partial<ReturnType<typeof useChatSession>> = {}
) {
  return {
    clearConversation: jest.fn(),
    isBusy: false,
    messages: [],
    tag: "chat-session",
    ...overrides,
  } as unknown as ReturnType<typeof useChatSession>;
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
  mockUseAuthSession.mockReturnValue({
    session: session("test-access-token"),
    status: "signedIn",
  });
  mockUseChatSession.mockReturnValue(chatSessionStub());
});

afterEach(() => {
  jest.clearAllMocks();
});

test("현재 세션의 access token으로 채팅 세션을 만들어 패널에 넘긴다", async () => {
  const { getByLabelText } = await renderWithHeroUI(<HomeScreen />);

  expect(mockUseChatSession).toHaveBeenCalledWith("test-access-token");
  expect(getByLabelText("chat panel with chat-session")).toBeOnTheScreen();
});

test("세션이 사라지면 채팅에 토큰을 넘기지 않는다", async () => {
  const view = await renderWithHeroUI(<HomeScreen />);

  mockUseAuthSession.mockReturnValue({ session: null, status: "signedOut" });
  await view.rerender(<HomeScreen />);

  expect(mockUseChatSession).toHaveBeenLastCalledWith(undefined);
});

test("메시지가 있으면 새 대화는 복구 불가 확인을 거쳐 초기화한다", async () => {
  const clearConversation = jest.fn();

  mockUseChatSession.mockReturnValue(
    chatSessionStub({
      clearConversation,
      messages: [{ id: "m1", parts: [], role: "user" }],
    } as never)
  );

  const alertSpy = jest
    .spyOn(Alert, "alert")
    .mockImplementation(() => undefined);
  const user = userEvent.setup();

  await renderWithHeroUI(<HomeScreen />);
  await user.press(screen.getByLabelText(chatLabels.newChat));

  expect(alertSpy).toHaveBeenCalledTimes(1);
  expect(clearConversation).not.toHaveBeenCalled();

  // 확인 버튼을 눌렀을 때만 실제로 비운다.
  const buttons = alertSpy.mock.calls[0]?.[2] as
    | { onPress?: () => void; text?: string }[]
    | undefined;
  const confirm = buttons?.find((button) => button.text === "새 대화 시작");

  confirm?.onPress?.();

  expect(clearConversation).toHaveBeenCalledTimes(1);

  alertSpy.mockRestore();
});

test("대화가 비어 있으면 확인 없이 그대로 둔다", async () => {
  const alertSpy = jest
    .spyOn(Alert, "alert")
    .mockImplementation(() => undefined);
  const user = userEvent.setup();

  await renderWithHeroUI(<HomeScreen />);
  await user.press(screen.getByLabelText(chatLabels.newChat));

  expect(alertSpy).not.toHaveBeenCalled();

  alertSpy.mockRestore();
});

test("생성 중에는 새 대화가 동작하지 않는다", async () => {
  mockUseChatSession.mockReturnValue(
    chatSessionStub({
      isBusy: true,
      messages: [{ id: "m1", parts: [], role: "user" }],
    } as never)
  );

  const alertSpy = jest
    .spyOn(Alert, "alert")
    .mockImplementation(() => undefined);
  const user = userEvent.setup();

  await renderWithHeroUI(<HomeScreen />);
  await user.press(screen.getByLabelText(chatLabels.newChat));

  expect(alertSpy).not.toHaveBeenCalled();

  alertSpy.mockRestore();
});
