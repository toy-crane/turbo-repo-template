import type { ImageSourcePropType } from "react-native";
import { Platform } from "react-native";

/**
 * One toolbar-icon meaning, defined for both platforms in one place.
 *
 * `Stack.Toolbar` draws its items natively, so it cannot use the shared `Icon`
 * component: iOS takes an SF Symbol name and Android takes an image source,
 * and a React Native view hosted inside Android's Compose toolbar cannot be
 * sized reliably. The PNGs are Material Symbols glyphs exported at 1x, 2x
 * and 3x.
 *
 * Sources: Google Material Symbols (outlined, 24px),
 * https://github.com/google/material-design-icons — © Google LLC,
 * Apache License 2.0, https://www.apache.org/licenses/LICENSE-2.0
 */
const toolbarIcons = {
  back: {
    android:
      require("../../../../assets/toolbar/back.png") as ImageSourcePropType,
    ios: "chevron.backward",
  },
  newChat: {
    android:
      require("../../../../assets/toolbar/new-chat.png") as ImageSourcePropType,
    ios: "plus",
  },
  profile: {
    android:
      require("../../../../assets/toolbar/profile.png") as ImageSourcePropType,
    ios: "person.crop.circle",
  },
} as const;

export type ToolbarIconName = keyof typeof toolbarIcons;

/**
 * The value for a `Stack.Toolbar.Button`'s `icon` prop on this platform.
 *
 * The prop form rather than a nested `Stack.Toolbar.Icon`: the nested element
 * left the button as an empty pill on iOS, and the prop form is what the
 * settings toolbar in this app already uses.
 */
export function toolbarIcon(name: ToolbarIconName) {
  const icon = toolbarIcons[name];

  return Platform.OS === "ios" ? icon.ios : icon.android;
}
