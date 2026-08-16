import { accessibilityValue } from "@expo/ui/swift-ui/modifiers";
import { Platform } from "react-native";

/**
 * What a screen reader adds to the button's own name while the action runs.
 *
 * Read after the name, the way iOS reads a settings row's value: 계정 삭제,
 * 진행 중. One phrase for both buttons, since the name already says which
 * action it is.
 */
export const ACTION_IN_PROGRESS = "진행 중";

/**
 * What a destructive settings row needs beyond its own children.
 *
 * `accessibilityValue` is what says the action is running. The progress view in
 * the trailing slot does not reach the accessibility tree on its own, so without
 * this the row reads exactly the same busy as idle.
 *
 * iOS only. These are SwiftUI modifiers, and the press area needs nothing here:
 * `ListItem` already applies `contentShape` so the whole row answers a press.
 */
export function destructiveActionModifiers(isRunning: boolean) {
  if (Platform.OS !== "ios" || !isRunning) {
    return;
  }

  return [accessibilityValue(ACTION_IN_PROGRESS)];
}
