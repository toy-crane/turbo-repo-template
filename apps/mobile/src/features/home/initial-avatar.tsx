import {
  Platform,
  Pressable,
  type PressableStateCallbackType,
  type StyleProp,
  StyleSheet,
  Text,
  View,
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
      <View style={styles.avatar}>
        <Text style={styles.initial}>{initial}</Text>
      </View>
    </Pressable>
  );
}

function getTouchTargetStyle({
  pressed,
}: PressableStateCallbackType): StyleProp<ViewStyle> {
  return [styles.touchTarget, pressed && styles.pressed];
}

const touchTargetSize = Platform.OS === "ios" ? 44 : 48;

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
  touchTarget: {
    alignItems: "center",
    height: touchTargetSize,
    justifyContent: "center",
    width: touchTargetSize,
  },
});
