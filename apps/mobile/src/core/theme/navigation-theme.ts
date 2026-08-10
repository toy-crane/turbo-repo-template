import { DarkTheme, DefaultTheme, type Theme } from "expo-router";

interface NavigationThemeColors {
  background: string;
  foreground: string;
}

export function getNavigationTheme(
  scheme: "dark" | "light",
  colors: NavigationThemeColors
): Theme {
  const baseTheme = scheme === "dark" ? DarkTheme : DefaultTheme;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      card: colors.background,
      text: colors.foreground,
    },
  };
}
