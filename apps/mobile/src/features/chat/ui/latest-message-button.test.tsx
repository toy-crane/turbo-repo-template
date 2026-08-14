import { beforeEach, expect, jest, test } from "@jest/globals";
import { screen, userEvent } from "@testing-library/react-native";
import { isLiquidGlassAvailable } from "expo-glass-effect";

import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { chatLabels } from "./chat-labels";
import { LatestMessageButton } from "./latest-message-button";

jest.mock("expo-glass-effect", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    GlassView: ({ children, ...props }: React.ComponentProps<typeof View>) =>
      React.createElement(
        View,
        { ...props, testID: "chat-latest-glass" },
        children
      ),
    isLiquidGlassAvailable: jest.fn(() => false),
  };
});

const mockIsLiquidGlassAvailable = jest.mocked(isLiquidGlassAvailable);

beforeEach(() => {
  jest.clearAllMocks();
});

test("Liquid Glass를 쓸 수 있으면 그것으로 그린다", async () => {
  mockIsLiquidGlassAvailable.mockReturnValue(true);

  await renderWithHeroUI(<LatestMessageButton onPress={jest.fn()} />);

  expect(screen.getByTestId("chat-latest-glass")).toBeOnTheScreen();
});

test("Liquid Glass가 없으면 지금과 같은 surface 원을 그대로 둔다", async () => {
  mockIsLiquidGlassAvailable.mockReturnValue(false);

  await renderWithHeroUI(<LatestMessageButton onPress={jest.fn()} />);

  expect(screen.queryByTestId("chat-latest-glass")).not.toBeOnTheScreen();
  // The fallback owns a plain fixed circle, while the glass branch keeps its
  // platform-owned style object.
  expect(JSON.stringify(screen.toJSON())).toContain(
    "h-11 w-11 items-center justify-center rounded-full bg-surface"
  );
});

test("어느 쪽이든 이름과 동작은 같다", async () => {
  const onPress = jest.fn();
  const user = userEvent.setup();
  mockIsLiquidGlassAvailable.mockReturnValue(true);

  await renderWithHeroUI(<LatestMessageButton onPress={onPress} />);

  await user.press(screen.getByLabelText(chatLabels.latest));

  expect(onPress).toHaveBeenCalledTimes(1);
});
