import { describe, expect, test } from "@jest/globals";

import {
  formatUsernameUnlockDate,
  isUsernameLockActive,
} from "./username-lock";

const NOW = new Date("2026-08-12T00:00:00.000Z");

describe("isUsernameLockActive", () => {
  test("잠금 시각이 없으면 바꿀 수 있다", () => {
    expect(isUsernameLockActive(null, NOW)).toBe(false);
    expect(isUsernameLockActive(undefined, NOW)).toBe(false);
  });

  test("잠금 시각이 지나지 않았으면 잠겨 있다", () => {
    expect(isUsernameLockActive("2026-09-11T00:00:00.000Z", NOW)).toBe(true);
  });

  test("잠금 시각이 지나면 다시 바꿀 수 있다", () => {
    expect(isUsernameLockActive("2026-08-11T23:59:59.000Z", NOW)).toBe(false);
  });

  // A value that cannot be read is not a lock. Comparing NaN would answer false
  // anyway, but only by accident, and the accident is worth pinning: the field
  // stays editable and the server still refuses a change it should refuse.
  test("읽을 수 없는 값은 잠금으로 보지 않는다", () => {
    expect(isUsernameLockActive("어제", NOW)).toBe(false);
  });
});

describe("formatUsernameUnlockDate", () => {
  // Built from the local date parts, so the day shown is the day on the reader's
  // own calendar rather than the server's.
  test("사람이 읽는 날짜로 보여 준다", () => {
    const unlockAt = new Date(2026, 8, 11, 9, 30);

    expect(formatUsernameUnlockDate(unlockAt.toISOString())).toBe(
      "2026년 9월 11일"
    );
  });

  test("한 자리 월과 일에 0을 붙이지 않는다", () => {
    const unlockAt = new Date(2026, 0, 5, 12, 0);

    expect(formatUsernameUnlockDate(unlockAt.toISOString())).toBe(
      "2026년 1월 5일"
    );
  });

  test("읽을 수 없는 값은 빈 문자열로 답한다", () => {
    expect(formatUsernameUnlockDate("내일")).toBe("");
  });
});
