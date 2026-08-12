import { expect, jest, test } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react-native";
import { useTheme } from "expo-router";
import { setBackgroundColorAsync } from "expo-system-ui";
import { Text } from "react-native";

import { AppThemeBridge, useAppTheme } from "./app-theme-bridge";

jest.mock("heroui-native/hooks", () => ({
  // Answers by token name rather than by position: the bridge asks for a
  // different set as the app grows, and a fixed array silently hands back the
  // wrong colours the moment that list changes.
  useThemeColor: (tokens: string[]) =>
    tokens.map(
      (token) =>
        ({
          background: "#0B0B0D",
          danger: "#FF453A",
          foreground: "#FFFFFF",
          surface: "#1A1A1E",
        })[token] ?? "#000000"
    ),
}));

jest.mock("uniwind", () => ({
  useUniwind: () => ({ hasAdaptiveThemes: true, theme: "dark" }),
}));

jest.mock("expo-system-ui", () => ({
  setBackgroundColorAsync: jest.fn(async () => undefined),
}));

const mockSetBackgroundColorAsync = jest.mocked(setBackgroundColorAsync);

function ThemeProbe() {
  const { background, foreground } = useAppTheme();
  const navigationTheme = useTheme();

  return (
    <>
      <Text>{foreground}</Text>
      <Text>{background}</Text>
      <Text>{String(navigationTheme.colors.background)}</Text>
    </>
  );
}

test("useAppTheme은 AppThemeBridge 밖에서 사용하면 명확히 실패한다", async () => {
  await expect(render(<ThemeProbe />)).rejects.toThrow(
    "useAppTheme must be used within AppThemeBridge"
  );
});

test("AppThemeBridge는 CSS 토큰을 navigation과 native root에 연결한다", async () => {
  await render(
    <AppThemeBridge>
      <ThemeProbe />
    </AppThemeBridge>
  );

  expect(screen.getByText("#FFFFFF")).toBeOnTheScreen();
  expect(screen.getAllByText("#0B0B0D")).toHaveLength(2);
  await waitFor(() => {
    expect(mockSetBackgroundColorAsync).toHaveBeenCalledWith("#0B0B0D");
  });
});
