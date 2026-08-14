import { Pressable } from "react-native";

import { Icon } from "@/shared/ui/icon";
import { chatLabels } from "./chat-labels";
import { FloatingSurface } from "./floating-surface";

const BUTTON_SIZE = 44;

const glassCircle = {
  alignItems: "center",
  borderRadius: BUTTON_SIZE / 2,
  height: BUTTON_SIZE,
  justifyContent: "center",
  width: BUTTON_SIZE,
} as const;

/**
 * The control that returns to the newest message while reading further back.
 *
 * It floats over the conversation on the same surface the way back into a side
 * chat uses, since the two stack in one place above the composer.
 */
export function LatestMessageButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={chatLabels.latest}
      accessibilityRole="button"
      onPress={onPress}
      testID="chat-latest"
    >
      <FloatingSurface
        glassShape={glassCircle}
        surfaceClassName="h-11 w-11 items-center justify-center rounded-full bg-surface"
        testID="chat-latest-glass"
      >
        <Icon name="latest" size="lg" />
      </FloatingSurface>
    </Pressable>
  );
}
