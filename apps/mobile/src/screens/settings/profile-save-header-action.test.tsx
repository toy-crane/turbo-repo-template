import { expect, jest, test } from "@jest/globals";
import { render, screen, userEvent } from "@testing-library/react-native";

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

  await userEvent.setup().press(screen.getByRole("button", { name: "저장" }));

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
