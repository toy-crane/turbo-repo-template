import { expect, jest, test } from "@jest/globals";
import { renderRouter, screen } from "expo-router/testing-library";
import type { PropsWithChildren } from "react";
import type { PressableProps } from "react-native";

jest.mock("expo-glass-tabs", () => {
  const React = require("react") as typeof import("react");
  const { Pressable, Text, View } =
    require("react-native") as typeof import("react-native");
  const Container = ({ children }: PropsWithChildren) =>
    React.createElement(View, null, children);

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
    TabBarMinimizeProvider: Container,
  };
});

test("/에서 Home 탭의 첫 화면을 표시한다", async () => {
  const router = renderRouter("./app", { initialUrl: "/" });
  await router;

  expect(router.getPathname()).toBe("/");
  expect(screen.getByLabelText("Home placeholder")).toBeOnTheScreen();
});
