import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Pressable, View } from "react-native";

import { Icon } from "@/shared/ui/icon";
import { chatLabels } from "./chat-labels";

const BUTTON_SIZE = 44;

const circle = {
  alignItems: "center",
  borderRadius: BUTTON_SIZE / 2,
  height: BUTTON_SIZE,
  justifyContent: "center",
  width: BUTTON_SIZE,
} as const;

/**
 * The control that returns to the newest message while reading further back.
 *
 * It floats over the conversation with no native shell to sit in, which is
 * the one case where this app draws Liquid Glass itself. Where the system
 * has no glass to give — Android, and iOS before 26 — it stays the plain
 * `surface` circle it has always been.
 */
export function LatestMessageButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={chatLabels.latest}
      accessibilityRole="button"
      onPress={onPress}
      testID="chat-latest"
    >
      {isLiquidGlassAvailable() ? (
        <GlassView glassEffectStyle="regular" isInteractive style={circle}>
          <Icon name="latest" size="lg" />
        </GlassView>
      ) : (
        <View className="bg-surface" style={circle}>
          <Icon name="latest" size="lg" />
        </View>
      )}
    </Pressable>
  );
}
