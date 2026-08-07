import { describe, expect, test } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ActivityScreen } from "./activity-screen";

describe("ActivityScreen", () => {
  test("스크롤 가능한 중립 placeholder를 screen reader가 식별할 수 있게 표시한다", async () => {
    await render(<ActivityScreen />);

    expect(screen.getByLabelText("Activity placeholder 1")).toHaveTextContent(
      "Placeholder 01"
    );
    expect(screen.getByLabelText("Activity placeholder 18")).toHaveTextContent(
      "Placeholder 18"
    );
    expect(
      StyleSheet.flatten(screen.getByText("Placeholder 01").props.style)
        .lineHeight
    ).toBeUndefined();
    expect(
      screen.queryByRole("heading", { name: "Activity" })
    ).not.toBeOnTheScreen();
  });
});
