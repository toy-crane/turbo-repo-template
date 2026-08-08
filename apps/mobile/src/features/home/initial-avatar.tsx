import {
  Pressable,
  type PressableStateCallbackType,
  type StyleProp,
  StyleSheet,
  Text,
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
      style={getAvatarStyle}
    >
      <Text style={styles.initial}>{initial}</Text>
    </Pressable>
  );
}

function getAvatarStyle({
  pressed,
}: PressableStateCallbackType): StyleProp<ViewStyle> {
  return [styles.avatar, pressed && styles.pressed];
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: "#4285F4",
    borderCurve: "continuous",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  initial: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.72,
  },
});
