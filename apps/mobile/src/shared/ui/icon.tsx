import { type ThemeColor, useThemeColor } from "heroui-native/hooks";
import ArrowUp from "lucide-react-native/icons/arrow-up";
import Bookmark from "lucide-react-native/icons/bookmark";
import { View } from "react-native";

const icons = {
  bookmark: Bookmark,
  send: ArrowUp,
} as const;

const iconSizes = {
  lg: 24,
  md: 20,
  sm: 16,
} as const;

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
  name: IconName;
  size?: IconSize;
  testID?: string;
  tone?: IconTone;
}

export function Icon({
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
      importantForAccessibility="no-hide-descendants"
      style={{ height: pixelSize, width: pixelSize }}
      testID={testID}
    >
      <IconComponent
        accessible={false}
        color={color}
        size={pixelSize}
        strokeWidth={2}
      />
    </View>
  );
}
