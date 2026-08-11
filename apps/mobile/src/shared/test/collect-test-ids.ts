import { screen } from "@testing-library/react-native";

/**
 * Returns the matching testIDs in the order the screen shows them. Queries
 * return matches in document order, so this is how a test proves that parts
 * appear in the order they arrived.
 */
export function collectTestIds(
  pattern: RegExp,
  accept: (testId: string) => boolean
): string[] {
  return screen
    .getAllByTestId(pattern)
    .map((element) => element.props.testID as string)
    .filter(accept);
}
