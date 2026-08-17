import { FilledIconButton, Host, Icon } from "@expo/ui/jetpack-compose";
import { ActivityIndicator, View, type ViewStyle } from "react-native";

import { profileLabels } from "@/features/auth/ui/profile-labels";
import { toolbarIcons } from "@/shared/ui/toolbar-icons";
import type { ProfileSaveHeaderActionProps } from "./profile-save-header-action";

const ICON_SIZE = 24;
const PROGRESS_FRAME: ViewStyle = {
  alignItems: "center",
  height: 48,
  justifyContent: "center",
  width: 56,
};

/**
 * Android implementation of `ProfileSaveHeaderAction`.
 *
 * A Material 3 filled icon button, which is how the platform draws an action
 * that confirms a form. Its own colours say whether the draft can be sent: a
 * filled circle when it can, a flat grey one when it cannot. Nothing here picks
 * a colour — Material owns both, and the app palette would have to keep them in
 * step for two platforms if it did.
 *
 * The Compose button leaves no name in the accessibility tree: the `Icon`'s
 * `contentDescription` does not reach the button node, and the Compose
 * `semantics` modifier carries only a content type. So a React Native view
 * wraps the whole control and carries the name, the role and the disabled
 * state, which is what a screen reader reports.
 *
 * That wrapper does not silence the Compose button, which stays in the tree as
 * a second, nameless one. `importantForAccessibility` does not reach it because
 * Compose supplies its own accessibility nodes. See
 * `docs/follow-ups/android-compose-button-unnamed-node.md`.
 */
export function ProfileSaveHeaderAction({
  isDisabled,
  isPending,
  onPress,
  tintColor,
}: ProfileSaveHeaderActionProps) {
  if (isPending) {
    return (
      <ActivityIndicator
        accessibilityLabel={profileLabels.saving}
        accessibilityRole="progressbar"
        accessibilityState={{ busy: true }}
        accessible
        color={tintColor}
        style={PROGRESS_FRAME}
      />
    );
  }

  return (
    <View
      accessibilityLabel={profileLabels.save}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessible
    >
      <Host matchContents>
        <FilledIconButton enabled={!isDisabled} onClick={onPress}>
          <Icon size={ICON_SIZE} source={toolbarIcons.save.android} />
        </FilledIconButton>
      </Host>
    </View>
  );
}
