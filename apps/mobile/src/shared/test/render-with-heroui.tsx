import { render } from "@testing-library/react-native";
import { HeroUINativeProviderRaw } from "heroui-native/provider-raw";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

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
  "--color-danger": "#dc2626",
  "--color-danger-hover": "#b91c1c",
  "--color-danger-soft-hover": "#fee2e2",
  "--color-default-hover": "#e5e7eb",
  "--color-success": "#16a34a",
  "--color-warning": "#ca8a04",
  "--theme": "default",
};

Uniwind.updateCSSVariables("light", testThemeVariables);
Uniwind.updateCSSVariables("dark", testThemeVariables);

function withProviders(element: ReactElement) {
  return (
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <HeroUINativeProviderRaw config={{ animation: "disable-all" }}>
        {element}
      </HeroUINativeProviderRaw>
    </SafeAreaProvider>
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
