import { DarkTheme, DefaultTheme, type Theme } from "expo-router";
import type { ColorSchemeName } from "react-native";

import { getSemanticColors } from "./semantic-colors";

export function getNavigationTheme(scheme: ColorSchemeName | null): Theme {
  const baseTheme = scheme === "dark" ? DarkTheme : DefaultTheme;
  const colors = getSemanticColors(scheme);

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
