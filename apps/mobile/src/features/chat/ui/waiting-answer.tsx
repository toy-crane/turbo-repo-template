import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColor } from "heroui-native/hooks";
import { useCallback, useEffect, useState } from "react";
import { type LayoutChangeEvent, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { chatLabels } from "./chat-labels";

const SWEEP_DURATION_MS = 1500;
/**
 * Narrow enough to read as a band crossing the word, not as the word lighting
 * up. It stays a number rather than a width class because the sweep starts at
 * `-SWEEP_WIDTH`: this is where the band begins as much as how wide it is, and
 * splitting the two would let a class and an animation drift apart.
 */
const SWEEP_WIDTH = 56;
/**
 * The line has already been kept back until the wait is worth reporting, so it
 * arrives gently rather than snapping into the answer's place.
 */
const APPEARING = FadeIn.duration(200).reduceMotion(ReduceMotion.System);

/**
 * What the answer's place says before its first character arrives.
 *
 * A band of the foreground colour crosses the word from left to right, so the
 * line reports progress by itself and no separate spinner is needed. The word
 * stays a plain `Text` behind a mask, which is what keeps it growing with the
 * system font size — and what makes its measured width the distance the band
 * travels, from just off its left edge to just past its right one.
 */
export function WaitingAnswer() {
  const isReducedMotion = useReducedMotion();
  const [mutedColor, foregroundColor] = useThemeColor(["muted", "foreground"]);
  const [labelWidth, setLabelWidth] = useState(0);
  const offset = useSharedValue(-SWEEP_WIDTH);

  const measureLabel = useCallback((event: LayoutChangeEvent) => {
    setLabelWidth(event.nativeEvent.layout.width);
  }, []);

  useEffect(() => {
    if (isReducedMotion || labelWidth === 0) {
      return;
    }

    offset.value = -SWEEP_WIDTH;
    offset.value = withRepeat(
      withTiming(labelWidth, {
        duration: SWEEP_DURATION_MS,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    return () => cancelAnimation(offset);
  }, [isReducedMotion, labelWidth, offset]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  if (isReducedMotion) {
    return (
      <Animated.View entering={APPEARING}>
        <Text className="text-base text-muted leading-6" testID="chat-waiting">
          {chatLabels.waiting}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={APPEARING}>
      <MaskedView
        maskElement={
          <Text className="text-base leading-6">{chatLabels.waiting}</Text>
        }
        testID="chat-waiting"
      >
        {/*
          The word again, invisible. The mask paints no space of its own, so
          this copy is what gives the row the height and width of the line, and
          its width is also how far the band has to travel.
        */}
        <View className="bg-muted">
          <Text
            className="text-base leading-6 opacity-0"
            onLayout={measureLabel}
          >
            {chatLabels.waiting}
          </Text>
        </View>
        <Animated.View
          style={[
            {
              bottom: 0,
              left: 0,
              position: "absolute",
              top: 0,
              width: SWEEP_WIDTH,
            },
            sweepStyle,
          ]}
          testID="chat-waiting-sweep"
        >
          <LinearGradient
            colors={[mutedColor, foregroundColor, mutedColor]}
            end={{ x: 1, y: 0.5 }}
            start={{ x: 0, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </MaskedView>
    </Animated.View>
  );
}
