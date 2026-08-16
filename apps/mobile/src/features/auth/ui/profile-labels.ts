import { formatUsernameUnlockDate } from "@/features/auth/state/username-lock";

/**
 * Every product string the settings sheet and the profile editor show.
 *
 * Gathered here for the same reason as the onboarding names: React Native
 * Testing Library and `agent-device` both select by them, so each one is part of
 * the verification contract rather than decoration.
 *
 * Where a state also exists in onboarding — an id being checked, an id already
 * taken — the message comes from `USERNAME_MESSAGES` rather than being written
 * again here. One state said two ways reads as two different states.
 */
export const profileLabels = {
  account: "계정",
  appInfo: "앱 정보",
  cancel: "취소",
  changePhoto: "사진 편집",
  confirmChange: "변경",
  deletePhoto: "현재 사진 삭제",
  /** The pill under the picture. Its accessible name stays the fuller 사진 편집. */
  edit: "편집",
  haptics: "햅틱 반응",
  nickname: "닉네임",
  notifications: "알림",
  pickFromLibrary: "사진 보관함에서 선택",
  preferences: "환경 설정",
  /*
    The destination, not the errand. This screen holds 계정 삭제 as well as the
    fields, so naming the row 프로필 수정 would promise less than it opens.
  */
  profile: "프로필",
  save: "저장",
  saving: "저장 중",
  settings: "설정",
  signOut: "로그아웃",
  suggestions: "사용할 수 있는 아이디",
  takePhoto: "사진 찍기",
  username: "아이디",
  version: "버전",
} as const;

/** What the settings sheet's close control is called. */
export const CLOSE_SETTINGS_LABEL = "설정 닫기";

/**
 * The standing rule, shown under the profile fields whenever the id is free to
 * change. Both halves are here rather than in the confirmation dialog because
 * this is where a person reads before deciding, not after.
 */
export const USERNAME_POLICY_NOTE =
  "아이디는 30일에 한 번 바꿀 수 있어요. 이전 아이디는 30일 동안 다른 사람이 사용할 수 없어요.";

/** Replaces the standing rule once the id is locked. */
export function usernameUnlockNote(lockedUntil: string): string {
  return `${formatUsernameUnlockDate(lockedUntil)}부터 아이디를 다시 바꿀 수 있어요.`;
}

/**
 * The confirmation before an id changes.
 *
 * The body says only what is about to become true and cannot be undone. The
 * previous-id protection is already in the footer the person just read, and
 * repeating it here would bury the one fact this dialog exists for.
 */
export const USERNAME_CONFIRM_TITLE = "아이디를 변경할까요?";
export const USERNAME_CONFIRM_BODY = "변경 후 30일 동안 다시 바꿀 수 없어요.";

export const CHECKING_USERNAME_MESSAGE =
  "사용할 수 있는 아이디인지 확인하고 있어요.";

/**
 * Shown in place of the photo, not over the OS dialog: by the time this appears
 * the system prompt is gone, and the person needs to know where the setting is
 * rather than that they pressed the wrong button.
 */
export const CAMERA_DENIED_MESSAGE =
  "카메라 접근을 허용하면 바로 프로필 사진을 찍을 수 있어요. 설정에서 권한을 바꿀 수 있어요.";

/** Says what survived the failure, so pressing 저장 again is the obvious move. */
export const SAVE_FAILED_MESSAGE =
  "프로필을 저장하지 못했어요. 입력한 내용은 그대로 두었어요. 다시 저장해 주세요.";

/** The id changed under the screen, which only a stale screen can reach. */
export const USERNAME_LOCKED_MESSAGE =
  "아이디를 아직 바꿀 수 없어요. 화면을 닫았다 다시 열어 주세요.";
