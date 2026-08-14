/**
 * Accessibility names double as the contract for tests and agent-device.
 * The same table lives in the repository README; change both together.
 */
export const chatLabels = {
  back: "뒤로 가기",
  /** Not shown: the icon row under a finished answer. */
  copyAnswer: "답변 복사",
  /** Shown as the menu item on a message. */
  copyMessage: "복사",
  /** Shown as the menu item on a message. */
  editMessage: "수정",
  /** Shown above the composer while a message is being rewritten. */
  editNotice: "이 메시지부터 다시 물어봐요.",
  /** Not shown: the button that leaves the edit state. */
  endEdit: "수정 그만두기",
  /** Spoken aloud when a request fails. The screen shows the same words. */
  errorAnnouncement: "답변을 받지 못했어요.",
  input: "메시지",
  latest: "최신 메시지로 이동",
  newChat: "새 대화",
  /** Not shown: the icon row under a finished answer. */
  regenerate: "답변 다시 받기",
  /** Shown as the button beside the error. */
  retry: "다시 시도하기",
  send: "보내기",
  /** Not shown: the send button's place while an answer is arriving. */
  stop: "답변 그만 받기",
  /**
   * Shown where the answer will appear, from the moment the wait is long
   * enough to notice until the first character lands. A label, so no period.
   */
  waiting: "Thinking",
} as const;
