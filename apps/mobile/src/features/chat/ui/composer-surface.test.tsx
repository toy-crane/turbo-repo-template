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

/**
 * A fresh element every time. React skips a rerender handed the very same
 * element, which would leave the branch under test unchanged.
 */
function composer() {
  return (
    <ComposerSurface>
      <Text>메시지</Text>
    </ComposerSurface>
  );
}

async function renderSurface() {
  const view = await renderWithHeroUI(composer());

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

// The fallback owns a plain fixed shape, while the glass branch keeps the style
// object its platform API requires. The two are written separately, so what is
// checked is that each one still names the whole shape.
test("두 경우 모두 같은 모양을 온전히 지정한다", async () => {
  const { surface: plain, view } = await renderSurface();

  expect(plain.props.className).toBe(
    "flex-row items-end gap-2 rounded-[26px] bg-surface p-1.5"
  );

  mockIsLiquidGlassAvailable.mockReturnValue(true);
  await view.rerender(composer());

  expect(
    StyleSheet.flatten(screen.getByTestId("chat-composer-surface").props.style)
  ).toEqual({
    alignItems: "flex-end",
    borderRadius: 26,
    flexDirection: "row",
    gap: 8,
    padding: 6,
  });
});
