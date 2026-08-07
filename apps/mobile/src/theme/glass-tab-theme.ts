import type { GlassTabBarTheme } from "expo-glass-tabs";
import type { ColorSchemeName } from "react-native";

const glassTabThemes: Record<"dark" | "light", GlassTabBarTheme> = {
  dark: {
    activeTint: "#FFFFFF",
    glassTint: "#0B0B0D8C",
    highlight: "#FFFFFF24",
    inactiveTint: "#FFFFFF99",
    solidFallback: "#1A1A1EF5",
  },
  light: {
    activeTint: "#111114",
    glassTint: "#F4F4F699",
    highlight: "#FFFFFFB8",
    inactiveTint: "#11111499",
    solidFallback: "#FFFFFFF5",
  },
};

export function getGlassTabTheme(scheme: ColorSchemeName | null) {
  return scheme === "dark" ? glassTabThemes.dark : glassTabThemes.light;
}
