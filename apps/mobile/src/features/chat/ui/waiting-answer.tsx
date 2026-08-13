import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColor } from "heroui-native/hooks";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { chatLabels } from "./chat-labels";

const SWEEP_DURATION_MS = 1500;

/**
 * What the answer's place says before its first character arrives.
 *
 * A band of the foreground colour crosses the words from left to right, so
 * the line reports progress by itself and no separate spinner is needed. The
 * words stay a plain `Text` behind a mask, which is what keeps them growing
 * with the system font size.
 */
export function WaitingAnswer() {
  const isReducedMotion = useReducedMotion();
  const mutedColor = useThemeColor("muted");
  const foregroundColor = useThemeColor("foreground");
  const offset = useSharedValue(-1);

  useEffect(() => {
    if (isReducedMotion) {
      return;
    }

    offset.value = withRepeat(
      withTiming(1, { duration: SWEEP_DURATION_MS, easing: Easing.linear }),
      -1,
      false
    );

    return () => cancelAnimation(offset);
  }, [isReducedMotion, offset]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${offset.value * 100}%` }],
  }));

  if (isReducedMotion) {
    return (
      <Text
        className="w-full text-base text-muted leading-6"
        testID="chat-waiting"
      >
        {chatLabels.waiting}
      </Text>
    );
  }

  return (
    <MaskedView
      maskElement={
        <Text className="text-base leading-6">{chatLabels.waiting}</Text>
      }
      testID="chat-waiting"
    >
      {/*
        The words again, invisible. The mask paints no space of its own, so
        this copy is what gives the row the height and width of the line.
      */}
      <View style={{ backgroundColor: mutedColor }}>
        <Text className="text-base leading-6 opacity-0">
          {chatLabels.waiting}
        </Text>
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, sweepStyle]}>
        <LinearGradient
          colors={[mutedColor, foregroundColor, mutedColor]}
          end={{ x: 1, y: 0.5 }}
          start={{ x: 0, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </MaskedView>
  );
}
