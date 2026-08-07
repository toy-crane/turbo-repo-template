import { describe, expect, test } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";

import { HomeScreen } from "./home-screen";

describe("HomeScreen", () => {
  test("native Stack 제목을 중복하지 않는 접근 가능한 placeholder를 표시한다", async () => {
    await render(<HomeScreen />);

    expect(screen.getByLabelText("Home placeholder")).toHaveTextContent(
      "콘텐츠를 준비 중입니다."
    );
    expect(
      screen.queryByRole("heading", { name: "Home" })
    ).not.toBeOnTheScreen();
  });
});
