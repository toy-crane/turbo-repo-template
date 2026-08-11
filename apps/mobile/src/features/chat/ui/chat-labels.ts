/**
 * Accessibility names double as the contract for tests and agent-device.
 * The same table lives in the repository README; change both together.
 */
export const chatLabels = {
  back: "뒤로 가기",
  cancelEdit: "취소",
  copied: "복사됨",
  copyCode: "코드 복사",
  copyMessage: "메시지 복사",
  copyUserMessage: "복사하기",
  editInput: "메시지 수정",
  editMessage: "수정하기",
  /** Spoken aloud when a request fails. The screen shows the same words. */
  errorAnnouncement: "답변을 받지 못했어요. 잠시 뒤에 다시 보내 주세요.",
  generating: "답변을 만드는 중",
  input: "메시지",
  newChat: "새 대화",
  regenerate: "다시 생성",
  retry: "다시 보내기",
  scrollToLatest: "최신 메시지로 이동",
  send: "보내기",
  sendEdit: "수정한 메시지 보내기",
  stop: "생성 중지",
} as const;
