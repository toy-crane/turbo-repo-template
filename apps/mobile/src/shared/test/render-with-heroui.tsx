import { render } from "@testing-library/react-native";
import { HeroUINativeProviderRaw } from "heroui-native/provider-raw";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

import { QueryProvider } from "@/core/providers/query-provider";

// Fixed metrics rather than the device's: a screen that reads insets should
// render the same way on every machine that runs the tests.
const testSafeAreaMetrics = {
  frame: { height: 852, width: 393, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 59 },
};

const testThemeVariables = {
  "--color-accent": "#4285f4",
  "--color-accent-foreground": "#ffffff",
  "--color-accent-hover": "#3277e6",
  "--color-background": "#f4f4f6",
  "--color-danger": "#dc2626",
  "--color-danger-hover": "#b91c1c",
  "--color-danger-soft-hover": "#fee2e2",
  "--color-default-hover": "#e5e7eb",
  "--color-foreground": "#111114",
  "--color-muted": "#6b7280",
  "--color-success": "#16a34a",
  "--color-success-foreground": "#ffffff",
  "--color-surface": "#ffffff",
  "--color-surface-foreground": "#111114",
  "--color-warning": "#ca8a04",
  "--theme": "default",
};

Uniwind.updateCSSVariables("light", testThemeVariables);
Uniwind.updateCSSVariables("dark", testThemeVariables);

function withProviders(element: ReactElement) {
  return (
    // The query cache is one of the app's providers, so a screen rendered here
    // finds the same thing it finds at runtime rather than throwing the moment
    // it reads remote state.
    <QueryProvider>
      <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
        <HeroUINativeProviderRaw config={{ animation: "disable-all" }}>
          {element}
        </HeroUINativeProviderRaw>
      </SafeAreaProvider>
    </QueryProvider>
  );
}

export async function renderWithHeroUI(element: ReactElement) {
  const view = await render(withProviders(element));

  return {
    ...view,
    // The plain rerender would replace the providers with the element alone, so
    // a test that renders the same screen with new props keeps losing them.
    rerender: (next: ReactElement) => view.rerender(withProviders(next)),
  };
}
