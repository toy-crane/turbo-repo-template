import { type SFSymbol, SymbolView } from "expo-symbols";
import { Platform } from "react-native";
import Svg, { Path } from "react-native-svg";

import {
  MATERIAL_SYMBOL_VIEW_BOX,
  type MaterialSymbolName,
  materialSymbolPaths,
} from "./material-paths";

/**
 * One icon meaning maps to both platform glyphs here, so no iOS-only string
 * ever leaks into shared screen code. The platform shapes differing slightly
 * is intended; the meaning and the owning control's accessibility label stay
 * the same.
 */
const icons = {
  copy: { material: "contentCopy", sf: "doc.on.doc" },
  edit: { material: "edit", sf: "pencil" },
  newChat: { material: "editSquare", sf: "square.and.pencil" },
  regenerate: { material: "refresh", sf: "arrow.clockwise" },
  scrollToLatest: { material: "keyboardArrowDown", sf: "chevron.down" },
  send: { material: "arrowUpward", sf: "arrow.up" },
  stop: { material: "stop", sf: "stop.fill" },
} as const satisfies Record<
  string,
  { material: MaterialSymbolName; sf: SFSymbol }
>;

export type IconName = keyof typeof icons;

export interface IconProps {
  name: IconName;
  size?: number;
  /**
   * A resolved color value, usually from `useThemeColor`. A value rather than
   * a class because neither `SymbolView` nor `Svg` reads Uniwind classes.
   */
  tintColor: string;
}

/**
 * The one way React Native screens draw a system icon.
 *
 * iOS renders the SF Symbol through `SymbolView`; Android draws the Material
 * Symbols path with `react-native-svg`, because React Native has no system
 * symbol view there. Icons are decorative on their own — the pressable that
 * owns one carries the accessibility name.
 */
export function Icon({ name, size = 20, tintColor }: IconProps) {
  const icon = icons[name];

  if (Platform.OS === "ios") {
    return <SymbolView name={icon.sf} size={size} tintColor={tintColor} />;
  }

  return (
    <Svg height={size} viewBox={MATERIAL_SYMBOL_VIEW_BOX} width={size}>
      <Path d={materialSymbolPaths[icon.material]} fill={tintColor} />
    </Svg>
  );
}
