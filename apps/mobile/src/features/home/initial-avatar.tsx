import { Avatar } from "heroui-native/avatar";
import {
  Platform,
  Pressable,
  type PressableStateCallbackType,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from "react-native";

interface InitialAvatarProps {
  initial: string;
  onPress: () => void;
}

export function InitialAvatar({ initial, onPress }: InitialAvatarProps) {
  return (
    <Pressable
      accessibilityHint="Opens Settings as a sheet"
      accessibilityLabel="Open settings"
      accessibilityRole="button"
      onPress={onPress}
      style={getTouchTargetStyle}
    >
      <Avatar
        alt={`${initial} profile`}
        color="accent"
        size="sm"
        style={styles.avatar}
        testID="profile-avatar-visual"
        variant="soft"
      >
        <Avatar.Fallback>{initial}</Avatar.Fallback>
      </Avatar>
    </Pressable>
  );
}

function getTouchTargetStyle({
  pressed,
}: PressableStateCallbackType): StyleProp<ViewStyle> {
  return [styles.touchTarget, pressed && styles.pressed];
}

const touchTargetSize = Platform.OS === "ios" ? 44 : 48;
const avatarVisualSize = 32;

const styles = StyleSheet.create({
  avatar: {
    aspectRatio: 1,
    borderRadius: avatarVisualSize / 2,
    flexShrink: 0,
    height: avatarVisualSize,
    width: avatarVisualSize,
  },
  pressed: {
    opacity: 0.72,
  },
  touchTarget: {
    alignItems: "center",
    height: touchTargetSize,
    justifyContent: "center",
    width: touchTargetSize,
  },
});
