/**
 * What 계정 삭제 says, in the two places it speaks.
 *
 * `deletionNotice` sits under the button and names what disappears, so a person
 * reads it before pressing. `confirmBody` is the dialog and says only that it
 * cannot be taken back. Splitting them that way keeps the same sentence from
 * being read twice.
 *
 * There is no "in progress" wording here on purpose: the button keeps its name
 * through the whole action and the progress indicator carries the state.
 */
export const accountDeletionLabels = {
  cancel: "취소",
  confirmBody:
    "지금 삭제하면 되돌릴 수 없습니다. 다시 가입해도 이전 정보는 돌아오지 않습니다.",
  confirmTitle: "계정을 삭제할까요?",
  deleteAccount: "계정 삭제",
  deletionFailed: "계정 삭제를 끝내지 못했습니다. 다시 시도해 주세요.",
  deletionNotice:
    "로그인 계정, 프로필과 올린 사진이 모두 삭제됩니다. 되돌릴 수 없습니다.",
} as const;
