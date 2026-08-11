import { describe, expect, test } from "@jest/globals";
import { screen } from "@testing-library/react-native";

import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { SavedScreen } from "./saved-screen";

const savedItemLabel = /^Saved item /;

describe("SavedScreen", () => {
  test("저장된 결정을 HeroUI Card와 Chip으로 구분해 표시한다", async () => {
    await renderWithHeroUI(<SavedScreen />);

    expect(
      screen.getByTestId("saved-bookmark-icon", {
        includeHiddenElements: true,
      })
    ).toBeOnTheScreen();
    expect(screen.getAllByLabelText(savedItemLabel)).toHaveLength(3);
    expect(screen.getByText("Theme")).toBeOnTheScreen();
    expect(screen.getByText("Navigation")).toBeOnTheScreen();
    expect(screen.getByText("HeroUI")).toBeOnTheScreen();
    expect(
      screen.queryByRole("heading", { name: "Saved" })
    ).not.toBeOnTheScreen();
  });
});
