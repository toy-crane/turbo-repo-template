import { expect, test } from "@jest/globals";
import { screen } from "@testing-library/react-native";

import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { Icon } from "./icon";

test.each([
  { className: "size-4", size: "sm" as const },
  { className: "size-5", size: "md" as const },
  { className: "size-6", size: "lg" as const },
])("$size 아이콘 자리를 크기 변형에 맞춘다", async ({ className, size }) => {
  await renderWithHeroUI(<Icon name="bookmark" size={size} testID="icon" />);

  const icon = screen.getByTestId("icon", { includeHiddenElements: true });

  expect(icon.props.className).toBe(className);
  expect(icon.props.style).toBeUndefined();
});
