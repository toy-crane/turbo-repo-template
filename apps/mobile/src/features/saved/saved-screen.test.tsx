import { describe, expect, test } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";

import { AppThemeProvider } from "../../theme/app-theme-provider";
import { SavedScreen } from "./saved-screen";

describe("SavedScreen", () => {
  test("저장한 항목이 들어갈 placeholder를 표시한다", async () => {
    await render(
      <AppThemeProvider>
        <SavedScreen />
      </AppThemeProvider>
    );

    expect(screen.getByLabelText("Saved placeholder")).toHaveTextContent(
      "저장한 항목이 여기에 표시됩니다."
    );
    expect(
      screen.queryByRole("heading", { name: "Saved" })
    ).not.toBeOnTheScreen();
  });
});
