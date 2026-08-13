import { expect, jest, test } from "@jest/globals";
import { render, screen, userEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ProfileSaveHeaderAction } from "./profile-save-header-action";

test("저장할 수 있을 때 Android 헤더에서 저장을 실행한다", async () => {
  const onPress = jest.fn();

  await render(
    <ProfileSaveHeaderAction
      isDisabled={false}
      isPending={false}
      onPress={onPress}
      tintColor="#2563eb"
    />
  );

  const button = screen.getByRole("button", { name: "저장" });
  const label = screen.getByText("저장");

  expect(StyleSheet.flatten(button.props.style)).toMatchObject({
    height: 48,
    width: 56,
  });
  expect(label).toHaveProp("adjustsFontSizeToFit", true);
  expect(label).toHaveProp("maxFontSizeMultiplier", 1.6);

  await userEvent.setup().press(button);

  expect(onPress).toHaveBeenCalledTimes(1);
});

test("저장 중에는 같은 헤더 자리를 진행 표시가 차지한다", async () => {
  const onPress = jest.fn();

  await render(
    <ProfileSaveHeaderAction
      isDisabled
      isPending
      onPress={onPress}
      tintColor="#2563eb"
    />
  );

  expect(screen.queryByRole("button", { name: "저장" })).not.toBeOnTheScreen();
  expect(
    screen.getByRole("progressbar", { name: "저장 중" })
  ).toBeOnTheScreen();
});
