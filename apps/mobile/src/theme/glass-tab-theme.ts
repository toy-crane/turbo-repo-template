import type { GlassTabBarTheme } from "expo-glass-tabs";
import type { ColorSchemeName } from "react-native";

const glassTabThemes: Record<"dark" | "light", GlassTabBarTheme> = {
  dark: {
    activeTint: "#FFFFFF",
    blurOverlay:
      "linear-gradient(to top, rgba(11,11,13,0.88) 0%, rgba(11,11,13,0.46) 42%, rgba(11,11,13,0.14) 68%, rgba(11,11,13,0) 88%)",
    blurTint: "dark",
    glassTint: "#0B0B0D8C",
    highlight: "#FFFFFF24",
    inactiveTint: "#FFFFFF99",
    solidFallback: "#1A1A1EF5",
  },
  light: {
    activeTint: "#111114",
    blurOverlay:
      "linear-gradient(to top, rgba(244,244,246,0.88) 0%, rgba(244,244,246,0.46) 42%, rgba(244,244,246,0.14) 68%, rgba(244,244,246,0) 88%)",
    blurTint: "light",
    glassTint: "#F4F4F699",
    highlight: "#FFFFFFB8",
    inactiveTint: "#11111499",
    solidFallback: "#FFFFFFF5",
  },
};

export function getGlassTabTheme(scheme: ColorSchemeName | null) {
  return scheme === "dark" ? glassTabThemes.dark : glassTabThemes.light;
}
