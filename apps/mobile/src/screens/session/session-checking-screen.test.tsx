import { expect, test } from "@jest/globals";
import { screen } from "@testing-library/react-native";

import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { SessionCheckingScreen } from "./session-checking-screen";

test("로그인 상태를 확인하는 동안 테마 배경으로 화면을 채운다", async () => {
  await renderWithHeroUI(<SessionCheckingScreen />);

  const screenView = screen.getByTestId("session-checking");

  expect(screenView.props.accessibilityLabel).toBe("로그인 상태 확인 중");
  expect(screenView.props.className).toBe("flex-1 bg-background");
  expect(screenView.props.style).toBeUndefined();
});
