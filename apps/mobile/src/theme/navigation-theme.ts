import { DarkTheme, DefaultTheme, type Theme } from "expo-router";
import type { ColorSchemeName } from "react-native";

import type { SemanticColors } from "./semantic-colors";

export function getNavigationTheme(
  scheme: ColorSchemeName | null,
  colors: SemanticColors
): Theme {
  const baseTheme = scheme === "dark" ? DarkTheme : DefaultTheme;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.background.canvas,
      card: colors.background.canvas,
      text: colors.text.primary,
    },
  };
}
