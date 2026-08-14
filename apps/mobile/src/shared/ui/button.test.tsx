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

test("전폭 버튼에서도 진행 표시를 가운데 문구 바로 앞에 둔다", async () => {
  await renderWithHeroUI(
    <Button isPending style={{ width: "100%" }}>
      저장하기
    </Button>
  );

  const leadingContent = screen.getByTestId("button-leading-content", {
    includeHiddenElements: true,
  });

  expect(leadingContent.props.className).toContain("right-full");
  expect(leadingContent.props.className).not.toContain("left-");
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

test("진행 중에는 작업을 시작하기 전의 실제 크기를 유지한다", async () => {
  const view = await renderWithHeroUI(<Button>내용만큼</Button>);
  const button = screen.getByRole("button");

  await act(() => {
    fireEvent(button, "layout", {
      nativeEvent: { layout: { height: 48, width: 104, x: 0, y: 0 } },
    });
  });

  await view.rerender(<Button isPending>내용만큼</Button>);

  const pendingButton = screen.getByRole("button");

  expect(StyleSheet.flatten(pendingButton.props.style)).toMatchObject({
    height: 48,
    width: 104,
  });
  expect(pendingButton.props.className).not.toContain("h-auto!");
});

test("처음부터 진행 중이면 측정 전까지 내용에 맞춘 높이를 유지한다", async () => {
  await renderWithHeroUI(<Button isPending>내용만큼</Button>);

  const button = screen.getByRole("button");

  expect(button.props.className).toContain("h-auto!");
  expect(StyleSheet.flatten(button.props.style)).not.toHaveProperty("height");
});

test.each([
  { className: "h-auto! min-h-10 px-[30px]! py-2.5", size: "sm" as const },
  { className: "h-auto! min-h-12 px-8! py-3", size: "md" as const },
  { className: "h-auto! min-h-14 px-9! py-3.5", size: "lg" as const },
])(
  "$size 버튼은 글자 크기를 제한하지 않고 내용에 맞춰 늘어난다",
  async ({ className, size }) => {
    await renderWithHeroUI(<Button size={size}>인증 코드 받기</Button>);

    const label = screen.getByText("인증 코드 받기");
    const button = screen.getByRole("button");

    expect(label.props.maxFontSizeMultiplier).toBeUndefined();
    expect(label.props.adjustsFontSizeToFit).toBeUndefined();
    expect(label.props.numberOfLines).toBeUndefined();
    expect(button.props.className).toContain(className);
    expect(StyleSheet.flatten(button.props.style)).not.toHaveProperty(
      "paddingHorizontal"
    );
  }
);
