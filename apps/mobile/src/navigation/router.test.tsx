import { expect, jest, test } from "@jest/globals";
import { setMinimized } from "expo-glass-tabs";
import { router as expoRouter } from "expo-router";
import {
  act,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";
import type { PropsWithChildren } from "react";
import type { PressableProps } from "react-native";

jest.mock("../features/activity/activity-screen", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    ActivityScreen: () =>
      React.createElement(View, { accessibilityLabel: "Activity placeholder" }),
  };
});

jest.mock("expo-glass-tabs", () => {
  const React = require("react") as typeof import("react");
  const { Pressable, Text, View } =
    require("react-native") as typeof import("react-native");
  const Container = ({ children }: PropsWithChildren) =>
    React.createElement(View, null, children);
  const minimizeState = {
    progress: { value: 0 },
    target: { value: 0 },
  };

  return {
    GlassTabBar: Container,
    GlassTabButton: ({
      item,
      ...props
    }: PressableProps & { item: { label: string } }) =>
      React.createElement(
        Pressable,
        props,
        React.createElement(Text, null, item.label)
      ),
    setMinimized: jest.fn(),
    TabBarMinimizeProvider: Container,
    useMinimizeOnScroll: () => jest.fn(),
    useMinimizeState: () => minimizeState,
  };
});

test("/에서 Home 탭의 첫 화면을 표시한다", async () => {
  const router = renderRouter("./app", { initialUrl: "/" });
  await router;

  expect(router.getPathname()).toBe("/");
  expect(screen.getByLabelText("Home placeholder")).toBeOnTheScreen();
});

test("포커스된 탭 경로가 바뀌면 탭 바를 확장 상태로 되돌린다", async () => {
  const resetMinimization = jest.mocked(setMinimized);
  resetMinimization.mockClear();
  const router = renderRouter("./app", { initialUrl: "/" });
  await router;
  const initialCallCount = resetMinimization.mock.calls.length;

  await act(() => {
    expoRouter.navigate("/activity");
  });

  await waitFor(() => {
    expect(router.getPathname()).toBe("/activity");
    expect(resetMinimization).toHaveBeenCalledTimes(initialCallCount + 1);
  });
  expect(resetMinimization).toHaveBeenLastCalledWith(expect.any(Object), 0);
});
