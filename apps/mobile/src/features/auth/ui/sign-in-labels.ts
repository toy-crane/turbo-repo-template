/**
 * Accessibility names for the sign-in flow.
 *
 * These double as the verification contract: React Native Testing Library and
 * `agent-device` both select by them, so changing one changes a test.
 *
 * The two provider names are the Korean localisation of "Continue with Google"
 * and "Continue with Apple". Both providers allow localising their button text
 * but not rewriting it, so these are not free copy.
 */
export const signInLabels = {
  apple: "Apple로 계속하기",
  code: "인증 코드",
  email: "이메일",
  emailMethod: "이메일로 계속하기",
  google: "Google로 계속하기",
  resend: "코드 다시 받기",
  submitEmail: "인증 코드 받기",
  verifying: "코드를 확인하고 있어요",
} as const;
