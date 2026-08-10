/**
 * Accessibility names double as the contract for tests and agent-device.
 * The same table lives in the repository README; change both together.
 */
export const chatLabels = {
  back: "뒤로 가기",
  cancelEdit: "편집 취소",
  copyCode: "코드 복사",
  copyMessage: "메시지 복사",
  editResend: "편집 후 다시 보내기",
  /** Spoken aloud when a request fails. The screen shows the same words. */
  errorAnnouncement: "답변을 받지 못했어요. 잠시 뒤에 다시 보내 주세요.",
  generating: "답변을 만드는 중",
  input: "메시지",
  newChat: "새 대화",
  regenerate: "다시 생성",
  retry: "다시 보내기",
  scrollToLatest: "최신 메시지로 이동",
  send: "보내기",
  stop: "생성 중지",
} as const;
