import { expect, jest, test } from "@jest/globals";
import { screen, userEvent } from "@testing-library/react-native";

import { renderWithHeroUI } from "../../test/render-with-heroui";
import { InitialAvatar } from "./initial-avatar";

test("이니셜 아바타로 Settings 진입 동작을 실행한다", async () => {
  const onPress = jest.fn();
  const user = userEvent.setup();

  await renderWithHeroUI(<InitialAvatar initial="T" onPress={onPress} />);

  expect(screen.getByText("T")).toBeOnTheScreen();
  const avatarButton = screen.getByRole("button", { name: "Open settings" });

  await user.press(avatarButton);
  expect(onPress).toHaveBeenCalledTimes(1);
});
