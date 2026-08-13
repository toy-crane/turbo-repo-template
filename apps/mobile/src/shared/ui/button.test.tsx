import { expect, jest, test } from "@jest/globals";
import {
  act,
  fireEvent,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { StyleSheet, View } from "react-native";

import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { Button } from "./button";

test("진행 중에도 원래 이름을 유지하고 다시 누를 수 없게 한다", async () => {
  const onPress = jest.fn();

  await renderWithHeroUI(
    <Button isPending onPress={onPress}>
      저장하기
    </Button>
  );

  const button = screen.getByRole("button", { name: "저장하기" });

  expect(button).toHaveTextContent("저장하기");
  expect(button).toBeBusy();
  expect(button).toBeDisabled();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();

  await userEvent.setup().press(button);

  expect(onPress).not.toHaveBeenCalled();
});

test("진행 중에는 앞쪽 내용을 스피너로 바꾼다", async () => {
  await renderWithHeroUI(
    <Button isPending startContent={<View testID="action-icon" />}>
      업로드하기
    </Button>
  );

  expect(screen.queryByTestId("action-icon")).not.toBeOnTheScreen();
  expect(screen.getByText("업로드하기")).toBeOnTheScreen();
});

test("기본 너비를 정하지 않고 사용처가 준 너비를 따른다", async () => {
  const view = await renderWithHeroUI(<Button>내용만큼</Button>);

  expect(
    StyleSheet.flatten(screen.getByRole("button").props.style)
  ).not.toHaveProperty("width");

  await view.rerender(<Button style={{ width: "100%" }}>가득 채우기</Button>);

  expect(
    StyleSheet.flatten(screen.getByRole("button").props.style)
  ).toMatchObject({ width: "100%" });
});

test("진행 중에는 작업을 시작하기 전의 실제 너비를 유지한다", async () => {
  const view = await renderWithHeroUI(<Button>내용만큼</Button>);
  const button = screen.getByRole("button");

  await act(() => {
    fireEvent(button, "layout", {
      nativeEvent: { layout: { height: 48, width: 104, x: 0, y: 0 } },
    });
  });

  await view.rerender(<Button isPending>내용만큼</Button>);

  expect(
    StyleSheet.flatten(screen.getByRole("button").props.style)
  ).toMatchObject({ width: 104 });
});
