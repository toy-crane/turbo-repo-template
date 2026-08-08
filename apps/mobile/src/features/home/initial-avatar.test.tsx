import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { InitialAvatar } from "./initial-avatar";

test("이니셜 아바타로 Settings 진입 동작을 실행한다", async () => {
  const onPress = jest.fn();

  await render(<InitialAvatar initial="T" onPress={onPress} />);

  expect(screen.getByText("T")).toBeOnTheScreen();
  fireEvent.press(screen.getByRole("button", { name: "Open settings" }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
