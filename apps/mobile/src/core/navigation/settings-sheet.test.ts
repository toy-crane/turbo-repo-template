import { describe, expect, test } from "@jest/globals";

import {
  getProfileRouteOptions,
  getSettingsRouteOptions,
  getSettingsSheetOptions,
  getSettingsStackScreenOptions,
} from "./settings-sheet";

describe("getSettingsSheetOptions", () => {
  test("Settings를 native page sheet로 열고 헤더는 안쪽 스택에 맡긴다", () => {
    expect(getSettingsSheetOptions()).toEqual({
      // Two headers would otherwise stack: the sheet's own and the one the
      // screens inside it draw.
      headerShown: false,
      presentation: "pageSheet",
    });
  });
});

describe("시트 안쪽 화면", () => {
  test("같은 표면으로 읽히도록 공통 옵션을 쓴다", () => {
    expect(getSettingsStackScreenOptions()).toEqual({
      // The chevron carries the back control on its own. Naming the previous
      // screen repeats it and eats the width the current title needs.
      headerBackButtonDisplayMode: "minimal",
      headerShadowVisible: false,
      headerTransparent: true,
    });
  });

  test("첫 화면은 한글 제목을 쓰고 뒤로 가기를 두지 않는다", () => {
    expect(getSettingsRouteOptions()).toEqual({
      headerBackVisible: false,
      title: "설정",
    });
  });

  // Pushed rather than presented, so the back arrow is the platform's own and
  // the profile behind it stays in place.
  // Named for the destination, not the errand: the screen holds 계정 삭제 as
  // well as the fields, so 프로필 수정 would promise less than it opens.
  test("프로필은 push한 화면의 제목을 쓴다", () => {
    expect(getProfileRouteOptions()).toEqual({ title: "프로필" });
  });
});
