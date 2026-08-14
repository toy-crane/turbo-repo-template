import { afterEach, expect, test } from "@jest/globals";
import { screen } from "@testing-library/react-native";

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

test("동작 줄이기를 켜면 움직임 없이 문구만 보여 준다", async () => {
  mockReducedMotion.isOn = true;

  await renderWithHeroUI(<WaitingAnswer />);

  expect(screen.getByText(chatLabels.waiting)).toBeOnTheScreen();
  expect(screen.getByTestId("chat-waiting").props.className).toContain(
    "text-muted"
  );
});
