import {
  listRowBackground,
  listRowInsets,
  listRowSeparator,
} from "@expo/ui/swift-ui/modifiers";
import { Platform } from "react-native";

/**
 * What it takes to put the profile header on the settings background rather than
 * in a card.
 *
 * A non-section child of a `FieldGroup` is still a row of the form, so SwiftUI
 * gives it the inset background, the padding and the separator every other row
 * gets. The header is not a row — it is the subject of the screen — so all three
 * are turned off and the layout inside it decides its own spacing.
 *
 * iOS only. Android's implementation lays an inline child out on the surface
 * already, and passing SwiftUI modifiers there would do nothing.
 */
export const heroRowModifiers =
  Platform.OS === "ios"
    ? [
        listRowBackground("clear"),
        listRowInsets({ bottom: 0, leading: 0, top: 0, trailing: 0 }),
        listRowSeparator("hidden"),
      ]
    : undefined;
