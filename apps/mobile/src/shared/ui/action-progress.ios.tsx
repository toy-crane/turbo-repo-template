import { ProgressView } from "@expo/ui/swift-ui";
import { progressViewStyle } from "@expo/ui/swift-ui/modifiers";

import type { ActionProgressProps } from "./action-progress";

/**
 * iOS implementation of `ActionProgress`.
 *
 * No children: `@expo/ui` passes them to SwiftUI's `ProgressView` as its label,
 * which the circular style draws on screen. The control around it already says
 * what is running.
 */
export function ActionProgress({ testID }: ActionProgressProps) {
  return (
    <ProgressView modifiers={[progressViewStyle("circular")]} testID={testID} />
  );
}
