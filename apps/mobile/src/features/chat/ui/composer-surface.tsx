import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { View } from "react-native";

/**
 * The same shape the class below draws, for the one branch that cannot take a
 * class. Keep the two in step.
 */
const glassShape = {
  alignItems: "flex-end",
  borderRadius: 26,
  flexDirection: "row",
  gap: 8,
  padding: 6,
} as const;

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
      <GlassView style={glassShape} testID="chat-composer-surface">
        {children}
      </GlassView>
    );
  }

  return (
    <View
      className="flex-row items-end gap-2 rounded-[26px] bg-surface p-1.5"
      testID="chat-composer-surface"
    >
      {children}
    </View>
  );
}
