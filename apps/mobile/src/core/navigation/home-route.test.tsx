import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  render,
  screen,
  userEvent,
  within,
} from "@testing-library/react-native";
import { router } from "expo-router";

import HomeRoute from "../../../app/(tabs)/(home)/index";

jest.mock("expo-router", () => {
  const React = require("react") as typeof import("react");
  const { Pressable, View } =
    require("react-native") as typeof import("react-native");

  const Toolbar = Object.assign(
    ({
      children,
      placement,
    }: {
      children?: import("react").ReactNode;
      placement?: string;
    }) =>
      React.createElement(View, {
        children,
        testID: `home-toolbar-${placement ?? "unknown"}`,
      }),
    {
      Button: ({
        accessibilityLabel,
        onPress,
      }: {
        accessibilityLabel?: string;
        onPress?: () => void;
      }) =>
        React.createElement(Pressable, {
          accessibilityLabel,
          accessibilityRole: "button",
          onPress,
        }),
      View: ({ children }: { children?: import("react").ReactNode }) =>
        React.createElement(View, { children }),
    }
  );

  return {
    router: { push: jest.fn() },
    Stack: { Toolbar },
  };
});

jest.mock("@/screens/home/home-screen", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    HomeScreen: () =>
      React.createElement(View, { accessibilityLabel: "Home content" }),
  };
});

jest.mock("@/screens/home/profile-avatar-button", () => {
  const React = require("react") as typeof import("react");
  const { Pressable } =
    require("react-native") as typeof import("react-native");

  return {
    ProfileAvatarButton: ({ onPress }: { onPress: () => void }) =>
      React.createElement(Pressable, {
        accessibilityLabel: "Open settings",
        accessibilityRole: "button",
        onPress,
      }),
  };
});

jest.mock("@/shared/ui/toolbar-icons", () => ({
  toolbarIcon: (name: string) => name,
}));

const mockPush = jest.mocked(router.push);

beforeEach(() => {
  mockPush.mockClear();
});

test("새 대화는 왼쪽에서 채팅을 열고 프로필은 오른쪽에 둔다", async () => {
  const user = userEvent.setup();
  await render(<HomeRoute />);

  const leftToolbar = within(screen.getByTestId("home-toolbar-left"));
  const rightToolbar = within(screen.getByTestId("home-toolbar-right"));

  await user.press(leftToolbar.getByRole("button", { name: "새 대화" }));

  expect(mockPush).toHaveBeenCalledWith("/chat");
  expect(
    rightToolbar.getByRole("button", { name: "Open settings" })
  ).toBeOnTheScreen();
});
