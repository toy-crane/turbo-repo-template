import { expect, test } from "@jest/globals";

import { toolbarIcon, toolbarIcons } from "./toolbar-icons";

/**
 * Which branch `toolbarIcon` takes cannot be exercised here: Metro and Babel
 * replace `process.env.EXPO_OS` with a literal while transforming, so the test
 * runs against one platform's already-chosen branch. What the tests can hold is
 * the table itself, which is where a missing platform would come from.
 */
test("새 대화 툴바는 단순한 plus 시스템 심벌을 쓴다", () => {
  expect(toolbarIcons.newChat.ios).toBe("plus");
});

// Leaving the Android side out does not shrink the button, it removes it:
// `Stack.Toolbar.Button` draws nothing when it gets no image source.
test("모든 툴바 아이콘이 두 플랫폼에 그릴 것을 가진다", () => {
  for (const icon of Object.values(toolbarIcons)) {
    expect(icon.android).toBeDefined();
    expect(icon.ios).toBeTruthy();
  }
});

test("이름마다 그 플랫폼의 값을 하나 돌려준다", () => {
  for (const [name, icon] of Object.entries(toolbarIcons)) {
    expect([icon.android, icon.ios]).toContain(
      toolbarIcon(name as keyof typeof toolbarIcons)
    );
  }
});
