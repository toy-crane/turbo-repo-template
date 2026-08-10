/**
 * Accessibility names for the profile onboarding screens.
 *
 * These double as the verification contract: React Native Testing Library and
 * `agent-device` both select by them, so changing one changes a test. The
 * README lists the same names.
 */
export const onboardingLabels = {
  /** Announced instead of leaving the green check to speak for itself. */
  available: "사용할 수 있는 아이디",
  checking: "아이디 확인 중",
  next: "다음",
  nickname: "닉네임",
  retryCheck: "아이디 다시 확인하기",
  start: "시작하기",
  suggestions: "사용 가능한 아이디",
  username: "아이디",
} as const;
