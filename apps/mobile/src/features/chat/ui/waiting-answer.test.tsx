import { afterEach, expect, test } from "@jest/globals";
import { screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { mockReducedMotion } from "@/shared/test/reduced-motion";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { chatLabels } from "./chat-labels";
import { WaitingAnswer } from "./waiting-answer";

afterEach(() => {
  mockReducedMotion.isOn = false;
});

test("문구는 띠가 지나갈 층과 함께 나온다", async () => {
  await renderWithHeroUI(<WaitingAnswer />);

  // Once as the mask and once as what the band runs over.
  expect(screen.queryAllByText(chatLabels.waiting).length).toBeGreaterThan(1);
  expect(JSON.stringify(screen.toJSON())).toContain("bg-muted");
});

// A band the width of the word would read as the whole line brightening and
// dimming. The spec fixes it narrower than that, at 56px; how fast it travels
// and how far belongs to the Development Build checks.
test("밝은 띠는 글자보다 좁은 56px이다", async () => {
  await renderWithHeroUI(<WaitingAnswer />);

  expect(
    StyleSheet.flatten(screen.getByTestId("chat-waiting-sweep").props.style)
  ).toMatchObject({ width: 56 });
});

test("동작 줄이기를 켜면 움직임 없이 문구만 보여 준다", async () => {
  mockReducedMotion.isOn = true;

  await renderWithHeroUI(<WaitingAnswer />);

  expect(screen.getByText(chatLabels.waiting)).toBeOnTheScreen();
  expect(screen.getByTestId("chat-waiting").props.className).toContain(
    "text-muted"
  );
});
