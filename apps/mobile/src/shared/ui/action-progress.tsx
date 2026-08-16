export interface ActionProgressProps {
  /** Identifier used to locate the indicator in tests. */
  testID?: string;
}

/**
 * The progress indicator for an action running inside an `@expo/ui` tree.
 *
 * Each platform draws its own thin circular ring: SwiftUI's `ProgressView` on
 * iOS, Compose's `CircularProgressIndicator` on Android. There is no universal
 * component for either, so the file is split rather than branched — an iOS
 * bundle never loads the Compose view, and an Android bundle never loads the
 * SwiftUI one.
 *
 * The indicator carries no label. The control it sits in keeps its own name for
 * the whole action, which is what a screen reader reads.
 */
export function ActionProgress(_props: ActionProgressProps) {
  return null;
}
