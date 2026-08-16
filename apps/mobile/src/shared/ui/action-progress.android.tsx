import { Row } from "@expo/ui";
import { CircularProgressIndicator } from "@expo/ui/jetpack-compose";
import { size } from "@expo/ui/jetpack-compose/modifiers";

import type { ActionProgressProps } from "./action-progress";

/**
 * Android implementation of `ActionProgress`.
 *
 * A thin circular ring, the same idea as the SwiftUI activity indicator on iOS,
 * so the same action reads the same way on both platforms. `LoadingIndicator`,
 * the Material 3 Expressive default, fills a 33dp blob that morphs through seven
 * shapes; beside a single line of text it reads as a mark rather than as
 * progress. `ContainedLoadingIndicator` is not used either: it draws at a fixed
 * 48dp, taller than a settings row.
 *
 * 20dp with a 2dp stroke rather than the Material default of 40dp and 4dp. The
 * indicator sits next to one word, so it takes the size of a word.
 *
 * The Compose component takes no `testID`, so the surrounding `Row` carries it.
 */
export function ActionProgress({ testID }: ActionProgressProps) {
  return (
    <Row testID={testID}>
      <CircularProgressIndicator modifiers={[size(20, 20)]} strokeWidth={2} />
    </Row>
  );
}
