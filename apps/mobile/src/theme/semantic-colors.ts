import type { ColorSchemeName } from "react-native";

const semanticColors = {
  dark: {
    background: {
      canvas: "#0B0B0D",
      surface: "#1A1A1E",
    },
    text: {
      primary: "#FFFFFF",
    },
  },
  light: {
    background: {
      canvas: "#F4F4F6",
      surface: "#FFFFFF",
    },
    text: {
      primary: "#111114",
    },
  },
} as const;

export function getSemanticColors(scheme: ColorSchemeName | null) {
  return scheme === "dark" ? semanticColors.dark : semanticColors.light;
}

export type SemanticColors = ReturnType<typeof getSemanticColors>;
