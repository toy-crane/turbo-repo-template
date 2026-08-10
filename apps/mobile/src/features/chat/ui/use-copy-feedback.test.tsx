import { afterEach, expect, jest, test } from "@jest/globals";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { setStringAsync } from "expo-clipboard";
import { Pressable, Text } from "react-native";

import { useCopyFeedback } from "./use-copy-feedback";

const mockSetString = jest.mocked(setStringAsync);

function CopyProbe() {
  const { copied, copy } = useCopyFeedback(() => "복사할 내용");

  return (
    <Pressable accessibilityLabel="복사" onPress={copy}>
      <Text>{copied ? "복사됨" : "복사"}</Text>
    </Pressable>
  );
}

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

test("복사가 끝나면 잠깐 복사됨을 보여주고 스스로 지운다", async () => {
  jest.useFakeTimers();

  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

  await render(<CopyProbe />);

  await user.press(screen.getByLabelText("복사"));

  expect(mockSetString).toHaveBeenCalledWith("복사할 내용");
  expect(screen.getByText("복사됨")).toBeOnTheScreen();

  await act(() => {
    jest.advanceTimersByTime(2000);
  });

  expect(screen.queryByText("복사됨")).not.toBeOnTheScreen();
});

test("복사 도중 화면에서 사라지면 타이머를 남기지 않는다", async () => {
  jest.useFakeTimers();

  // 클립보드 쓰기가 끝나기 전에 행이 사라지는 상황이다. 가상 목록은 언제든
  // 행을 걷어낸다.
  let finishCopy: () => void = () => undefined;

  mockSetString.mockImplementation(
    () =>
      new Promise<boolean>((resolve) => {
        finishCopy = () => resolve(true);
      })
  );

  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  const view = await render(<CopyProbe />);

  await user.press(screen.getByLabelText("복사"));

  await view.unmount();

  // 테스트 도구도 타이머를 쓰므로 개수 대신 이 훅만 쓰는 2초짜리를 본다.
  const schedule = jest.spyOn(global, "setTimeout");

  await act(() => {
    finishCopy();

    return Promise.resolve();
  });

  expect(schedule).not.toHaveBeenCalledWith(expect.any(Function), 2000);

  schedule.mockRestore();
});
