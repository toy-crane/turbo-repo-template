import AccountCircle from "@expo/material-symbols/account_circle.xml";
import Add from "@expo/material-symbols/add.xml";
import ArrowBack from "@expo/material-symbols/arrow_back.xml";
import Check from "@expo/material-symbols/check.xml";
import Close from "@expo/material-symbols/close.xml";

/**
 * One toolbar-icon meaning, defined for both platforms in one place.
 *
 * `Stack.Toolbar` draws its items natively, so it cannot use the shared `Icon`
 * component: iOS takes an SF Symbol name and Android takes an image source.
 * Leaving the Android side out is not a smaller button but no button at all —
 * `Stack.Toolbar.Button` renders nothing without one.
 *
 * The Android side is a Material Symbols vector drawable from
 * `@expo/material-symbols`, which is what Expo Router's own documentation
 * points to. Each icon is its own module, so Metro bundles only the ones named
 * here, the drawable scales without per-density copies, and the toolbar tints
 * it with its own colour.
 */
export const toolbarIcons = {
  back: { android: ArrowBack, ios: "chevron.backward" },
  close: { android: Close, ios: "xmark" },
  newChat: { android: Add, ios: "plus" },
  profile: { android: AccountCircle, ios: "person.crop.circle" },
  /**
   * The confirmation action of a settings form.
   *
   * Android reads this entry from a Compose `FilledIconButton` rather than a
   * `Stack.Toolbar.Button`, because the toolbar button cannot draw the filled
   * circle the platform gives a confirmation action. The meaning still belongs
   * in one table, so the drawable stays here with its iOS symbol.
   */
  save: { android: Check, ios: "checkmark" },
} as const;

export type ToolbarIconName = keyof typeof toolbarIcons;

/**
 * The value for a `Stack.Toolbar.Button`'s `icon` prop on this platform.
 *
 * `process.env.EXPO_OS` rather than `Platform.OS`: Metro replaces it with a
 * string at build time and drops the branch that does not match, so the
 * drawables stay out of the iOS bundle and the symbol names out of Android's.
 *
 * Callers pass the result to the `icon` prop rather than to a nested
 * `Stack.Toolbar.Icon`: the nested element left the button as an empty pill
 * on iOS.
 */
export function toolbarIcon(name: ToolbarIconName) {
  const icon = toolbarIcons[name];

  return process.env.EXPO_OS === "ios" ? icon.ios : icon.android;
}
