import { describe, expect, test } from "@jest/globals";
import { screen } from "@testing-library/react-native";

import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { ActivityScreen } from "./activity-screen";

const activityItemLabel = /^Activity item \d+\./;

describe("ActivityScreen", () => {
  test("스크롤 검증용 활동 18개를 가벼운 HeroUI Card로 표시한다", async () => {
    await renderWithHeroUI(<ActivityScreen />);

    expect(screen.getAllByLabelText(activityItemLabel)).toHaveLength(18);
    expect(screen.getByText("Theme tokens synced 01")).toBeOnTheScreen();
    expect(screen.getByText("Component previewed 18")).toBeOnTheScreen();
    expect(
      screen.queryByRole("heading", { name: "Activity" })
    ).not.toBeOnTheScreen();
  });
});
