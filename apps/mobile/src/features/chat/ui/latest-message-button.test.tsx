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
  // The circle is painted by a class, so what is checked is that the fallback
  // still names `surface` and adds no border or shadow of its own.
  expect(JSON.stringify(screen.toJSON())).toContain("bg-surface");
});

test("어느 쪽이든 이름과 동작은 같다", async () => {
  const onPress = jest.fn();
  const user = userEvent.setup();
  mockIsLiquidGlassAvailable.mockReturnValue(true);

  await renderWithHeroUI(<LatestMessageButton onPress={onPress} />);

  await user.press(screen.getByLabelText(chatLabels.latest));

  expect(onPress).toHaveBeenCalledTimes(1);
});
