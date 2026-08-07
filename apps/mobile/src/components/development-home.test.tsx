import { describe, expect, jest, test } from "@jest/globals";
import { render, screen, userEvent } from "@testing-library/react-native";

import { isDevelopmentBuild } from "../utils/is-development-build";
import { DevelopmentHome } from "./development-home";

jest.mock("../utils/is-development-build", () => ({
  isDevelopmentBuild: jest.fn(() => true),
}));

jest.useFakeTimers();

const mockIsDevelopmentBuild = jest.mocked(isDevelopmentBuild);

describe("DevelopmentHome", () => {
  test("사용자가 Development Build 런타임을 검증한다", async () => {
    const user = userEvent.setup();

    await render(<DevelopmentHome />);

    expect(
      screen.getByRole("heading", { name: "Expo Development Build" })
    ).toBeOnTheScreen();
    expect(screen.getByText("Development Build 검증 대기")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "런타임 검증" }));

    expect(screen.getByText("Development Build 검증 완료")).toBeOnTheScreen();
  });

  test("Development Build 증거가 없으면 성공으로 표시하지 않는다", async () => {
    mockIsDevelopmentBuild.mockReturnValueOnce(false);
    const user = userEvent.setup();

    await render(<DevelopmentHome />);
    await user.press(screen.getByRole("button", { name: "런타임 검증" }));

    expect(
      screen.getByText("Development Build 런타임을 확인할 수 없음")
    ).toBeOnTheScreen();
    expect(
      screen.queryByText("Development Build 검증 완료")
    ).not.toBeOnTheScreen();
  });
});
