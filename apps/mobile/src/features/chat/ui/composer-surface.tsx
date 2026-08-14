import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

/**
 * The input and its button are one control, so one rounded shape holds both.
 * The numbers live here rather than in classes because both branches have to
 * come out the same size, and only one of them can take a class.
 */
const shape = StyleSheet.create({
  composer: {
    alignItems: "flex-end",
    borderRadius: 26,
    flexDirection: "row",
    gap: 8,
    padding: 6,
  },
});

/**
 * The surface the composer floats on.
 *
 * On iOS 26 and later the whole control is Liquid Glass, which is what the
 * system uses for a control that sits above content. Everywhere else the same
 * shape and placement come back as a plain surface: a blur standing in for the
 * material would hide the platform difference instead of keeping it honest.
 */
export function ComposerSurface({ children }: { children: ReactNode }) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView style={shape.composer} testID="chat-composer-surface">
        {children}
      </GlassView>
    );
  }

  return (
    <View
      className="bg-surface"
      style={shape.composer}
      testID="chat-composer-surface"
    >
      {children}
    </View>
  );
}
