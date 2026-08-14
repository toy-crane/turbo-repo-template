import { afterEach, expect, jest, test } from "@jest/globals";
import { screen } from "@testing-library/react-native";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { StyleSheet, Text } from "react-native";

import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { ComposerSurface } from "./composer-surface";

jest.mock("expo-glass-effect", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    // The stand-in marks itself, so a test can tell which of the two the
    // composer asked for without reaching for the native material.
    GlassView: (props: React.ComponentProps<typeof View>) =>
      React.createElement(View, {
        ...props,
        glass: true,
      } as React.ComponentProps<typeof View>),
    isLiquidGlassAvailable: jest.fn(() => false),
  };
});

const mockIsLiquidGlassAvailable = jest.mocked(isLiquidGlassAvailable);

afterEach(() => {
  mockIsLiquidGlassAvailable.mockReturnValue(false);
});

const composer = (
  <ComposerSurface>
    <Text>메시지</Text>
  </ComposerSurface>
);

function surfaceStyle() {
  return StyleSheet.flatten(
    screen.getByTestId("chat-composer-surface").props.style
  );
}

async function renderSurface() {
  const view = await renderWithHeroUI(composer);

  return { surface: screen.getByTestId("chat-composer-surface"), view };
}

test("Liquid Glass를 쓸 수 있으면 입력 영역 전체를 하나의 Glass로 그린다", async () => {
  mockIsLiquidGlassAvailable.mockReturnValue(true);

  const { surface } = await renderSurface();

  expect(surface.props.glass).toBe(true);
  expect(surface.props.className).toBeUndefined();
});

// Standing a blur in for the material would hide the platform difference
// instead of keeping it.
test("Liquid Glass를 쓸 수 없으면 흉내 내지 않고 일반 surface로 그린다", async () => {
  const { surface } = await renderSurface();

  expect(surface.props.glass).toBeUndefined();
  expect(surface.props.className).toContain("bg-surface");
});

test("두 경우의 크기와 모양이 같다", async () => {
  const { view } = await renderSurface();
  const plain = surfaceStyle();

  mockIsLiquidGlassAvailable.mockReturnValue(true);
  await view.rerender(composer);

  expect(surfaceStyle()).toEqual(plain);
  expect(plain).toMatchObject({ alignItems: "flex-end", borderRadius: 26 });
});
