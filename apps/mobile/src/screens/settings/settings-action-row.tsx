import { ListItem, Row, Spacer } from "@expo/ui";
import type { ModifierConfig } from "@expo/ui/swift-ui/modifiers";
import type { ReactNode } from "react";
import { Platform } from "react-native";

/**
 * A single settings row on both platforms.
 *
 * Android's `FieldGroup.Section` already wraps each child in a Material 3
 * `ListItem`, so nesting another `ListItem` creates an extra card behind the
 * content — a white rectangle around the label, with the trailing content lost
 * inside it. iOS sections do not add that interactive wrapper, so they keep
 * `ListItem` and the full-width button hit area it brings.
 */
export function SettingsActionRow({
  children,
  modifiers,
  onPress,
  testID,
  trailing,
}: {
  children: ReactNode;
  modifiers?: ModifierConfig[];
  onPress: () => void;
  testID: string;
  trailing?: ReactNode;
}) {
  if (Platform.OS === "ios") {
    return (
      <ListItem
        modifiers={modifiers}
        onPress={onPress}
        testID={testID}
        trailing={trailing}
      >
        {children}
      </ListItem>
    );
  }

  return (
    <Row alignment="center" onPress={onPress} testID={testID}>
      {children}
      <Spacer flexible />
      {trailing}
    </Row>
  );
}
