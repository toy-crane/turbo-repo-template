import { ThemeProvider } from "expo-router";
import { setBackgroundColorAsync } from "expo-system-ui";
import { useThemeColor } from "heroui-native/hooks";
import {
  createContext,
  type PropsWithChildren,
  use,
  useEffect,
  useMemo,
} from "react";
import { useUniwind } from "uniwind";

import { getNavigationTheme } from "./navigation-theme";

export interface AppThemeValue {
  background: string;
  foreground: string;
  scheme: "dark" | "light";
  surface: string;
}

const AppThemeContext = createContext<AppThemeValue | null>(null);

export function AppThemeBridge({ children }: PropsWithChildren) {
  const [background, foreground, surface] = useThemeColor([
    "background",
    "foreground",
    "surface",
  ]);
  const { theme } = useUniwind();
  const scheme = theme === "dark" ? "dark" : "light";
  const navigationTheme = useMemo(
    () => getNavigationTheme(scheme, { background, foreground }),
    [background, foreground, scheme]
  );
  const value = useMemo<AppThemeValue>(
    () => ({ background, foreground, scheme, surface }),
    [background, foreground, scheme, surface]
  );

  useEffect(() => {
    setBackgroundColorAsync(background).catch(() => undefined);
  }, [background]);

  return (
    <AppThemeContext value={value}>
      <ThemeProvider value={navigationTheme}>{children}</ThemeProvider>
    </AppThemeContext>
  );
}

export function useAppTheme() {
  const theme = use(AppThemeContext);

  if (!theme) {
    throw new Error("useAppTheme must be used within AppThemeBridge");
  }

  return theme;
}
