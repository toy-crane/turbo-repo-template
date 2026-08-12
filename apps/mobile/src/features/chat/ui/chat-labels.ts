/**
 * Accessibility names double as the contract for tests and agent-device.
 * The same table lives in the repository README; change both together.
 */
export const chatLabels = {
  back: "뒤로 가기",
  /** Spoken aloud when a request fails. The screen shows the same words. */
  errorAnnouncement: "답변을 받지 못했어요.",
  input: "메시지",
  latest: "최신 메시지로 이동",
  newChat: "새 대화",
  send: "보내기",
} as const;
