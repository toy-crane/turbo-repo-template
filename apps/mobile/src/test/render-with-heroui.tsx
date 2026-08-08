import { render } from "@testing-library/react-native";
import { HeroUINativeProviderRaw } from "heroui-native/provider-raw";
import type { ReactElement } from "react";
import { Uniwind } from "uniwind";

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

export function renderWithHeroUI(element: ReactElement) {
  return render(
    <HeroUINativeProviderRaw config={{ animation: "disable-all" }}>
      {element}
    </HeroUINativeProviderRaw>
  );
}
