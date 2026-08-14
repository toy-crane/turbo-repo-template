import { PressableFeedback } from "heroui-native/pressable-feedback";
import { View } from "react-native";

import { Icon, type IconName } from "@/shared/ui/icon";
import { chatLabels } from "./chat-labels";

/**
 * The buttons are `size-7` and sit against each other, so a `size-4` icon
 * leaves the drawn shapes `size-3` apart and the row reads as one group. That
 * is closer than two 44px press targets could sit without overlapping, so the
 * drawn box is the whole target across and `hitSlop` only reaches up and down,
 * where the row has no neighbour to take the touch from. It is the one measure
 * here that cannot be a class, since `hitSlop` takes a number.
 */
const ACTION_VERTICAL_HIT_SLOP = 6;

function ActionButton({
  isDisabled,
  label,
  name,
  onPress,
}: {
  isDisabled: boolean;
  label: string;
  name: IconName;
  onPress: () => void;
}) {
  return (
    // The library's own pressable: it answers a touch with a scale, and adds
    // the highlight iOS expects and the ripple Android expects.
    <PressableFeedback
      accessibilityLabel={label}
      accessibilityRole="button"
      className={
        isDisabled
          ? "size-7 items-center justify-center rounded-full opacity-40"
          : "size-7 items-center justify-center rounded-full"
      }
      hitSlop={{
        bottom: ACTION_VERTICAL_HIT_SLOP,
        top: ACTION_VERTICAL_HIT_SLOP,
      }}
      isDisabled={isDisabled}
      onPress={onPress}
    >
      <PressableFeedback.Highlight />
      <PressableFeedback.Ripple />
      <Icon name={name} size="sm" tone="muted" />
    </PressableFeedback>
  );
}

/** What a finished answer offers: take it away, or ask for another one. */
export function MessageActions({
  isDisabled = false,
  onCopy,
  onRegenerate,
}: {
  isDisabled?: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
}) {
  return (
    // The negative margin puts the first icon's drawn shape, not the padding
    // around it, on the same left edge as the answer above.
    <View className="mt-1.5 -ml-1.5 flex-row" testID="chat-message-actions">
      <ActionButton
        isDisabled={isDisabled}
        label={chatLabels.copyAnswer}
        name="copy"
        onPress={onCopy}
      />
      <ActionButton
        isDisabled={isDisabled}
        label={chatLabels.regenerate}
        name="regenerate"
        onPress={onRegenerate}
      />
    </View>
  );
}
