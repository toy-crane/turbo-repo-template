import { expect, test } from "@jest/globals";
import { screen } from "@testing-library/react-native";

import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { HomeScreen } from "./home-screen";

test("대화를 시작하기 전에는 제목과 짧은 안내만 보여준다", async () => {
  await renderWithHeroUI(<HomeScreen />);

  expect(screen.getByText("무엇을 도와드릴까요?")).toBeOnTheScreen();
  expect(
    screen.getByText("위의 새 대화 버튼을 누르면 바로 물어볼 수 있어요.")
  ).toBeOnTheScreen();
});
