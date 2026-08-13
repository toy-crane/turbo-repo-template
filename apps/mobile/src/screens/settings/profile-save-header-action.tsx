import { useCallback } from "react";
import {
  ActivityIndicator,
  type ColorValue,
  Pressable,
  type PressableStateCallbackType,
  Text,
  type ViewStyle,
} from "react-native";

import { profileLabels } from "@/features/auth/ui/profile-labels";

const ACTION_SIZE = 48;
const DISABLED_OPACITY = 0.35;
const PRESSED_OPACITY = 0.6;
const FRAME: ViewStyle = {
  alignItems: "center",
  height: ACTION_SIZE,
  justifyContent: "center",
  width: ACTION_SIZE,
};

export function ProfileSaveHeaderAction({
  isDisabled,
  isPending,
  onPress,
  tintColor,
}: {
  isDisabled: boolean;
  isPending: boolean;
  onPress: () => void;
  tintColor: ColorValue;
}) {
  const pressableStyle = useCallback(
    ({ pressed }: PressableStateCallbackType) => {
      let opacity = 1;

      if (isDisabled) {
        opacity = DISABLED_OPACITY;
      } else if (pressed) {
        opacity = PRESSED_OPACITY;
      }

      return { ...FRAME, opacity };
    },
    [isDisabled]
  );

  if (isPending) {
    return (
      <ActivityIndicator
        accessibilityLabel={profileLabels.saving}
        accessibilityRole="progressbar"
        accessibilityState={{ busy: true }}
        accessible
        color={tintColor}
        style={FRAME}
      />
    );
  }

  return (
    <Pressable
      accessibilityLabel={profileLabels.save}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={8}
      onPress={onPress}
      style={pressableStyle}
    >
      <Text
        maxFontSizeMultiplier={1.6}
        numberOfLines={1}
        style={{ color: tintColor, fontSize: 16, fontWeight: "600" }}
      >
        {profileLabels.save}
      </Text>
    </Pressable>
  );
}
