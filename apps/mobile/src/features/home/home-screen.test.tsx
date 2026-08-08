import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { useToast } from "heroui-native/toast";

import { renderWithHeroUI } from "../../test/render-with-heroui";
import { HomeScreen } from "./home-screen";

jest.mock("heroui-native/toast", () => ({
  useToast: jest.fn(),
}));

const hideToast = jest.fn();
const showToast = jest.fn(() => "preview-toast");
const mockUseToast = jest.mocked(useToast);
const heroUIPreviewLabel = /^HeroUI Native preview\./;

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseToast.mockReturnValue({
      isToastVisible: false,
      toast: { hide: hideToast, show: showToast },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("HeroUI 입력과 로딩, Toast 피드백을 한 화면에서 체험한다", async () => {
    await renderWithHeroUI(<HomeScreen />);

    expect(screen.getByLabelText(heroUIPreviewLabel)).toBeOnTheScreen();
    expect(screen.getByText("React Native UI")).toBeOnTheScreen();
    expect(screen.getByText("HeroUI Native")).toBeOnTheScreen();
    const input = screen.getByLabelText("콘텐츠 이름");

    await fireEvent.changeText(input, "알림 카드");
    await fireEvent.press(
      screen.getByRole("button", { name: "HeroUI 체험하기" })
    );

    expect(screen.getByRole("button", { name: "적용 중" })).toBeDisabled();

    await act(() => {
      jest.advanceTimersByTime(650);
    });

    expect(showToast).toHaveBeenCalledWith({
      description: "알림 카드 샘플의 입력과 피드백 상태를 확인했습니다.",
      label: "HeroUI 체험 완료",
      placement: "bottom",
      variant: "success",
    });
    expect(
      screen.getByRole("button", { name: "HeroUI 체험하기" })
    ).toBeEnabled();
    expect(
      screen.queryByRole("heading", { name: "Home" })
    ).not.toBeOnTheScreen();
  });
});
