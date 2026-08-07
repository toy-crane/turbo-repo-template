import { expect, jest, test } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react-native";
import { useTheme } from "expo-router";
import { setBackgroundColorAsync } from "expo-system-ui";
// biome-ignore lint/performance/noNamespaceImport: Jest must spy on the module export used by the provider.
import * as ReactNative from "react-native";
import { Text } from "react-native";

import { AppThemeProvider, useAppTheme } from "./app-theme-provider";

jest.mock("expo-system-ui", () => ({
  setBackgroundColorAsync: jest.fn(async () => undefined),
}));

const mockSetBackgroundColorAsync = jest.mocked(setBackgroundColorAsync);

function ThemeProbe() {
  const { colors } = useAppTheme();
  const navigationTheme = useTheme();

  return (
    <>
      <Text>{colors.text.primary}</Text>
      <Text>{String(navigationTheme.colors.background)}</Text>
    </>
  );
}

test("useAppTheme은 AppThemeProvider 밖에서 사용하면 명확히 실패한다", async () => {
  await expect(render(<ThemeProbe />)).rejects.toThrow(
    "useAppTheme must be used within AppThemeProvider"
  );
});

test("AppThemeProvider는 appearance에 맞는 색상을 공급하고 native root를 동기화한다", async () => {
  const colorScheme = jest
    .spyOn(ReactNative, "useColorScheme")
    .mockReturnValue("dark");

  try {
    await render(
      <AppThemeProvider>
        <ThemeProbe />
      </AppThemeProvider>
    );

    expect(screen.getByText("#FFFFFF")).toBeOnTheScreen();
    expect(screen.getByText("#0B0B0D")).toBeOnTheScreen();
    await waitFor(() => {
      expect(mockSetBackgroundColorAsync).toHaveBeenCalledWith("#0B0B0D");
    });
  } finally {
    colorScheme.mockRestore();
  }
});
