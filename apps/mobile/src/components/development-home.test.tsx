import { describe, expect, jest, test } from "@jest/globals";
import { render, screen, userEvent } from "@testing-library/react-native";

import { DevelopmentHome } from "./development-home";

jest.useFakeTimers();

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
});
