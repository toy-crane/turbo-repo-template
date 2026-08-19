import { describe, expect, test } from "bun:test";

import appJson from "../../../mobile/app.json" with { type: "json" };
import {
  APP_NAME,
  collectPlaceholders,
  isPlaceholder,
  PRIVACY_OFFICER,
  SUPPORT_EMAIL,
} from "./site";

const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

describe("site config", () => {
  // `bun run setup` writes the display name into apps/mobile/app.json but not
  // into this app, so a rename would leave the web pages naming the old app
  // while the store listing names the new one. This is the tripwire for that.
  // `turbo.json` runs this task uncached because that file is outside the hash.
  test("앱 이름이 Expo 설정의 표시 이름과 같다", () => {
    expect(APP_NAME).toBe(appJson.expo.name);
  });

  test("자리표시자인지 판정한다", () => {
    expect(isPlaceholder("support@example.com")).toBe(true);
    expect(isPlaceholder("미정")).toBe(true);
    expect(isPlaceholder("Turbo Repo Mobile")).toBe(true);
    expect(isPlaceholder("help@turbo-repo.app")).toBe(false);
    expect(isPlaceholder("김보호")).toBe(false);
  });

  // Fixtures rather than the live constants: filling in a real address is the
  // outcome this site asks for, and it must not turn the test suite red.
  test("자리표시자로 남은 항목만 골라낸다", () => {
    const entries = [
      { label: "채운 값", value: "help@turbo-repo.app" },
      { label: "빈 이름", value: "미정" },
      { label: "빈 주소", value: "support@example.com" },
    ];

    expect(collectPlaceholders(entries)).toEqual(["빈 이름", "빈 주소"]);
  });

  test("채운 값만 있으면 아무것도 남지 않는다", () => {
    const entries = [
      { label: "이름", value: "터보 스튜디오" },
      { label: "주소", value: "help@turbo-repo.app" },
    ];

    expect(collectPlaceholders(entries)).toEqual([]);
  });

  test("연락처가 주소 형식이다", () => {
    for (const address of [SUPPORT_EMAIL, PRIVACY_OFFICER.email]) {
      expect(address).toMatch(EMAIL_SHAPE);
    }
  });
});
