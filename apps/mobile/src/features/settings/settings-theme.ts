import type { ColorSchemeName } from "react-native";

import { getSemanticColors } from "../../theme/semantic-colors";

export function getSettingsTextStyle(scheme: ColorSchemeName | null) {
  return { color: getSemanticColors(scheme).text.primary };
}
