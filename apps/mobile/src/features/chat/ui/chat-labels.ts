/**
 * Accessibility names double as the contract for tests and agent-device.
 * The same table lives in the repository README; change both together.
 */
export const chatLabels = {
  /**
   * Shown as the item this app adds to the system text selection menu on a
   * finished parent answer. Deliberately not translated: it is the product's
   * own name for what it opens; see GLOSSARY.md.
   */
  askInSideChat: "Ask in side chat",
  back: "뒤로 가기",
  /** Not shown: the side chat sheet's close button. */
  closeSideChat: "Side chat 닫기",
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
  /** Shown as the side chat sheet's title. */
  sideChat: "Side chat",
  /** Not shown: the send button's place while an answer is arriving. */
  stop: "답변 그만 받기",
  /**
   * Shown where the answer will appear, from the moment the wait is long
   * enough to notice until the first character lands. A label, so no period.
   */
  waiting: "Thinking",
} as const;

/** Shown on the count floating above the parent conversation's composer. */
export function sideChatCountLabel(count: number): string {
  return `Side chat ${count}개`;
}

/**
 * Not shown: what pressing the count does, which is not the same thing when
 * there is only one side chat to go back into.
 */
export function sideChatCountAction(count: number): string {
  return count === 1
    ? "Side chat 1개 다시 열기"
    : `Side chat ${count}개 고르기`;
}

/** Not shown: one row of the list that reopens a side chat. */
export function openSideChatAction(phrase: string): string {
  return `${phrase} Side chat 열기`;
}
