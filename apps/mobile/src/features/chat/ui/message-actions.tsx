import { Pressable, View } from "react-native";

import { Icon, type IconName } from "@/shared/ui/icon";
import { chatLabels } from "./chat-labels";

/**
 * The row shows 32px buttons and grows each press target to the 44px minimum
 * with `hitSlop`, so reaching an icon does not depend on hitting the drawn
 * shape. 12px between two icons is what keeps the grown targets from
 * overlapping: each one reaches 6px past its own edge.
 */
const ACTION_SIZE = 32;
const ACTION_TARGET = 44;
const ACTION_HIT_SLOP = (ACTION_TARGET - ACTION_SIZE) / 2;
const ACTION_GAP = ACTION_TARGET - ACTION_SIZE;

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
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={ACTION_HIT_SLOP}
      onPress={onPress}
      style={{
        alignItems: "center",
        height: ACTION_SIZE,
        justifyContent: "center",
        opacity: isDisabled ? 0.4 : 1,
        width: ACTION_SIZE,
      }}
    >
      <Icon name={name} size="sm" tone="muted" />
    </Pressable>
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
    <View
      // The negative margin puts the first icon's drawn shape, not its
      // padding, on the same left edge as the answer above it.
      style={{
        flexDirection: "row",
        gap: ACTION_GAP,
        marginLeft: -ACTION_HIT_SLOP,
        marginTop: 6,
      }}
      testID="chat-message-actions"
    >
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
