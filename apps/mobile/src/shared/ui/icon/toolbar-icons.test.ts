import { afterEach, expect, jest, test } from "@jest/globals";
import { Platform } from "react-native";

import { toolbarIcon } from "./toolbar-icons";

afterEach(() => {
  jest.restoreAllMocks();
});

test("새 대화 툴바는 단순한 plus 시스템 심벌을 쓴다", () => {
  jest.replaceProperty(Platform, "OS", "ios");

  expect(toolbarIcon("newChat")).toBe("plus");
});
