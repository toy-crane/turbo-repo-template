import { type ThemeColor, useThemeColor } from "heroui-native/hooks";
import ArrowDown from "lucide-react-native/icons/arrow-down";
import ArrowUp from "lucide-react-native/icons/arrow-up";
import Bookmark from "lucide-react-native/icons/bookmark";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Copy from "lucide-react-native/icons/copy";
import MessagesSquare from "lucide-react-native/icons/messages-square";
import Pencil from "lucide-react-native/icons/pencil";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import Square from "lucide-react-native/icons/square";
import X from "lucide-react-native/icons/x";
import { View } from "react-native";

const icons = {
  bookmark: Bookmark,
  close: X,
  copy: Copy,
  edit: Pencil,
  forward: ChevronRight,
  latest: ArrowDown,
  regenerate: RefreshCw,
  send: ArrowUp,
  sideChat: MessagesSquare,
  stop: Square,
} as const;

const iconSizes = {
  lg: 24,
  md: 20,
  sm: 16,
} as const;

const iconSizeClassNames = {
  lg: "size-6",
  md: "size-5",
  sm: "size-4",
} as const satisfies Record<keyof typeof iconSizes, string>;

const iconTones = {
  accent: "accent",
  accentForeground: "accent-foreground",
  default: "foreground",
  muted: "muted",
} as const satisfies Record<string, ThemeColor>;

export type IconName = keyof typeof icons;
export type IconSize = keyof typeof iconSizes;
export type IconTone = keyof typeof iconTones;

export interface IconProps {
  /** Paints the shape solid instead of drawing its outline. */
  filled?: boolean;
  name: IconName;
  size?: IconSize;
  testID?: string;
  tone?: IconTone;
}

export function Icon({
  filled = false,
  name,
  size = "md",
  testID,
  tone = "default",
}: IconProps) {
  const color = useThemeColor(iconTones[tone]);
  const IconComponent = icons[name];
  const pixelSize = iconSizes[size];

  return (
    <View
      accessibilityElementsHidden
      className={iconSizeClassNames[size]}
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      <IconComponent
        accessible={false}
        color={color}
        size={pixelSize}
        strokeWidth={2}
        // Spread rather than `fill={filled ? color : undefined}`: Lucide passes
        // whatever it receives down to the shape, and an explicit `undefined`
        // would replace the "none" that leaves every other icon an outline.
        {...(filled ? { fill: color } : {})}
      />
    </View>
  );
}
