import { Row } from "@expo/ui";
import { LoadingIndicator } from "@expo/ui/jetpack-compose";

import type { ActionProgressProps } from "./action-progress";

/**
 * Android implementation of `ActionProgress`.
 *
 * `LoadingIndicator` is the Material 3 Expressive indicator and takes its own
 * size. `ContainedLoadingIndicator` is not used: it draws at a fixed 48dp, which
 * is taller than a settings row.
 *
 * The Compose component takes no `testID`, so the surrounding `Row` carries it.
 */
export function ActionProgress({ testID }: ActionProgressProps) {
  return (
    <Row testID={testID}>
      <LoadingIndicator />
    </Row>
  );
}
