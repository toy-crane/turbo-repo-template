import { expect, test } from "@jest/globals";
import { screen } from "@testing-library/react-native";

import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { HomeScreen } from "./home-screen";

const firstParagraph = /Lorem ipsum dolor sit amet/;
const lastParagraph = /Integer posuere erat a ante/;

test("Large Title 동작을 확인할 수 있는 긴 임시 본문을 스크롤한다", async () => {
  await renderWithHeroUI(<HomeScreen />);

  expect(screen.getByTestId("home-scroll")).toHaveProp(
    "contentInsetAdjustmentBehavior",
    "automatic"
  );
  expect(screen.getAllByTestId("home-placeholder-paragraph")).toHaveLength(8);
  expect(screen.getByText(firstParagraph)).toBeOnTheScreen();
  expect(screen.getByText(lastParagraph)).toBeOnTheScreen();
  expect(screen.queryByText("무엇을 도와드릴까요?")).not.toBeOnTheScreen();
});
