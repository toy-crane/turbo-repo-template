import { PressableFeedback } from "heroui-native/pressable-feedback";
import { View } from "react-native";

import { Icon, type IconName } from "@/shared/ui/icon";
import { chatLabels } from "./chat-labels";

/**
 * The icons sit 32px apart centre to centre, which is the density the chat
 * apps people already use settled on and closer than two 44px press targets
 * could ever sit without overlapping. So the drawn 32px box is the whole
 * target across, and `hitSlop` only reaches up and down, where the row has no
 * neighbour to take the touch from.
 */
const ACTION_SIZE = 32;
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
      hitSlop={{
        bottom: ACTION_VERTICAL_HIT_SLOP,
        top: ACTION_VERTICAL_HIT_SLOP,
      }}
      isDisabled={isDisabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        borderRadius: ACTION_SIZE / 2,
        height: ACTION_SIZE,
        justifyContent: "center",
        opacity: isDisabled ? 0.4 : 1,
        width: ACTION_SIZE,
      }}
    >
      <PressableFeedback.Highlight />
      <PressableFeedback.Ripple />
      <Icon name={name} tone="muted" />
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
    <View
      // The boxes sit against each other, and the negative margin puts the
      // first icon's drawn shape, not the padding around it, on the same left
      // edge as the answer above.
      style={{
        flexDirection: "row",
        marginLeft: -ACTION_VERTICAL_HIT_SLOP,
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
