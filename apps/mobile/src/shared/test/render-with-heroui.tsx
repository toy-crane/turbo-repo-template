import { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import { HeroUINativeProviderRaw } from "heroui-native/provider-raw";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { QueryProvider } from "@/core/providers/query-provider";

// Fixed metrics rather than the device's: a screen that reads insets should
// render the same way on every machine that runs the tests.
const testSafeAreaMetrics = {
  frame: { height: 852, width: 393, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 59 },
};

export function createTestQueryClient() {
  // A finite GC delay leaves a real Node timer behind after unmount. Each test
  // owns its client, so background eviction only keeps the Jest worker alive.
  return new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Number.POSITIVE_INFINITY },
      queries: { gcTime: Number.POSITIVE_INFINITY },
    },
  });
}

function withProviders(element: ReactElement, safeAreaBottomInset: number) {
  const safeAreaMetrics = {
    ...testSafeAreaMetrics,
    insets: { ...testSafeAreaMetrics.insets, bottom: safeAreaBottomInset },
  };

  return (
    // The query cache is one of the app's providers, so a screen rendered here
    // finds the same thing it finds at runtime rather than throwing the moment
    // it reads remote state.
    <QueryProvider>
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <HeroUINativeProviderRaw config={{ animation: "disable-all" }}>
          {element}
        </HeroUINativeProviderRaw>
      </SafeAreaProvider>
    </QueryProvider>
  );
}

export async function renderWithHeroUI(
  element: ReactElement,
  { safeAreaBottomInset = testSafeAreaMetrics.insets.bottom } = {}
) {
  const view = await render(withProviders(element, safeAreaBottomInset));

  return {
    ...view,
    // The plain rerender would replace the providers with the element alone, so
    // a test that renders the same screen with new props keeps losing them.
    rerender: (next: ReactElement) =>
      view.rerender(withProviders(next, safeAreaBottomInset)),
  };
}
