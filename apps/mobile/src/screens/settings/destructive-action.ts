import { accessibilityValue } from "@expo/ui/swift-ui/modifiers";
import { useEffect } from "react";
import { AccessibilityInfo, Platform } from "react-native";

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

/**
 * How Android says the same thing, since it cannot say it on the row.
 *
 * `@expo/ui 57.0.11` exposes one Compose semantics modifier and it only carries
 * `contentType`, so nothing reaches the row's accessibility node from here — the
 * row reads the same busy as idle. An announcement is what is left, and it is
 * also what this app already does for the chat error.
 *
 * It carries the action's own name because it arrives on its own: iOS reads
 * 계정 삭제 then 진행 중 because the row supplies the first half, and an
 * announcement has no row in front of it.
 *
 * Fires once when the action starts rather than for as long as it runs. Android
 * has no way to hold the state on the row, so a person who moves away and comes
 * back hears nothing. The deletion takes well under a second, so there is little
 * to come back to.
 */
export function useDestructiveActionAnnouncement(
  actionName: string,
  isRunning: boolean
) {
  useEffect(() => {
    if (Platform.OS === "ios" || !isRunning) {
      return;
    }

    AccessibilityInfo.announceForAccessibility(
      `${actionName} ${ACTION_IN_PROGRESS}`
    );
  }, [actionName, isRunning]);
}
