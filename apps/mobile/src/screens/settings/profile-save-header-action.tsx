import type { ColorValue } from "react-native";

export interface ProfileSaveHeaderActionProps {
  /** No change to send yet, or a value the server would refuse. */
  isDisabled: boolean;
  isPending: boolean;
  onPress: () => void;
  /** The header's own ink, for the indicator that replaces the control. */
  tintColor: ColorValue;
}

/**
 * The confirmation action of the profile form, for the platforms whose header
 * cannot draw one itself.
 *
 * Only Android mounts this: iOS gets the same control from
 * `Stack.Toolbar.Button` with the `prominent` variant, which the native toolbar
 * owns. The file is split rather than branched so an iOS bundle never loads the
 * Compose view, the same way `ActionProgress` is split.
 *
 * Placement, the states it must tell apart and why it looks the way it does are
 * in [모바일 설정 폼 저장](../../../../../docs/decisions/mobile-settings-form-save.md).
 */
export function ProfileSaveHeaderAction(_props: ProfileSaveHeaderActionProps) {
  return null;
}
