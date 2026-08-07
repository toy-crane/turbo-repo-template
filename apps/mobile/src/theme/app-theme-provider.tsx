import { ThemeProvider } from "expo-router";
import { setBackgroundColorAsync } from "expo-system-ui";
import {
  createContext,
  type PropsWithChildren,
  use,
  useEffect,
  useMemo,
} from "react";
import { type ColorSchemeName, useColorScheme } from "react-native";

import { getNavigationTheme } from "./navigation-theme";
import { getSemanticColors, type SemanticColors } from "./semantic-colors";

interface AppThemeValue {
  colors: SemanticColors;
  scheme: ColorSchemeName | null;
}

const AppThemeContext = createContext<AppThemeValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const scheme = useColorScheme();
  const colors = useMemo(() => getSemanticColors(scheme), [scheme]);
  const navigationTheme = useMemo(
    () => getNavigationTheme(scheme, colors),
    [colors, scheme]
  );
  const value = useMemo(() => ({ colors, scheme }), [colors, scheme]);

  useEffect(() => {
    setBackgroundColorAsync(colors.background.canvas).catch(() => undefined);
  }, [colors.background.canvas]);

  return (
    <AppThemeContext value={value}>
      <ThemeProvider value={navigationTheme}>{children}</ThemeProvider>
    </AppThemeContext>
  );
}

export function useAppTheme() {
  const theme = use(AppThemeContext);

  if (!theme) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }

  return theme;
}
