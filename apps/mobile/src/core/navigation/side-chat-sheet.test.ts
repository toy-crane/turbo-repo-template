import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { Platform } from "react-native";

import { getSideChatSheetOptions } from "./side-chat-sheet";

const BACKGROUND = "#f4f4f6";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("getSideChatSheetOptions", () => {
  // The conversation behind the sheet is not a screen this one came from, so
  // the only way out is the close button in the toolbar.
  test("Side chat을 native page sheet로 열고 뒤로 가기를 두지 않는다", () => {
    jest.replaceProperty(Platform, "OS", "ios");

    expect(getSideChatSheetOptions(BACKGROUND)).toEqual({
      headerBackVisible: false,
      // The sheet already has its own edge; a hairline draws a second one.
      headerShadowVisible: false,
      headerTransparent: true,
      presentation: "pageSheet",
      scrollEdgeEffects: { top: "soft" },
      title: "Side chat",
    });
  });

  test("Android는 테마 배경을 쓴 앱 바를 그린다", () => {
    jest.replaceProperty(Platform, "OS", "android");

    expect(getSideChatSheetOptions(BACKGROUND)).toEqual({
      headerBackVisible: false,
      headerShadowVisible: false,
      headerStyle: { backgroundColor: BACKGROUND },
      presentation: "pageSheet",
      title: "Side chat",
    });
  });

  // A side chat reads and scrolls like the conversation it came from, so it
  // must not meet its header differently on either platform.
  test("어느 플랫폼에서도 제목 아래 구분선을 두지 않는다", () => {
    for (const os of ["android", "ios"] as const) {
      jest.replaceProperty(Platform, "OS", os);

      expect(getSideChatSheetOptions(BACKGROUND)).toMatchObject({
        headerShadowVisible: false,
      });
    }
  });
});
