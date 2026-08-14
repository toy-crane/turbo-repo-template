import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";

/**
 * The surface a control floating over the conversation sits on.
 *
 * These controls have no native shell to sit in, which is the one case where
 * this app draws Liquid Glass itself. Where the system has no glass to give —
 * Android, and iOS before 26 — the same shape comes back as a plain `surface`.
 *
 * The glass branch cannot take a class, so each caller hands in the shape
 * twice: once as a style object and once as the classes that draw it. Keep the
 * two in step.
 */
export function FloatingSurface({
  children,
  glassShape,
  surfaceClassName,
  testID,
}: {
  children: ReactNode;
  glassShape: ViewStyle;
  surfaceClassName: string;
  testID: string;
}) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        isInteractive
        style={glassShape}
        testID={testID}
      >
        {children}
      </GlassView>
    );
  }

  return <View className={surfaceClassName}>{children}</View>;
}
