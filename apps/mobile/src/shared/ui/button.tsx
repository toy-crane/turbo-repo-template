import {
  type ButtonRootProps,
  type ButtonSize,
  type ButtonVariant,
  Button as HeroButton,
} from "heroui-native/button";
import { type ThemeColor, useThemeColor } from "heroui-native/hooks";
import { Spinner } from "heroui-native/spinner";
import { type ReactNode, useCallback, useRef } from "react";
import {
  type LayoutChangeEvent,
  type PressableStateCallbackType,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";

type OmitButtonState<T> = T extends ButtonRootProps
  ? Omit<T, "children" | "isDisabled" | "onLayout">
  : never;

export type ButtonProps = OmitButtonState<ButtonRootProps> & {
  children: ReactNode;
  isDisabled?: boolean;
  isPending?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
  startContent?: ReactNode;
};

const SPINNER_COLOR: Record<ButtonVariant, ThemeColor> = {
  danger: "danger-foreground",
  "danger-soft": "danger-soft-foreground",
  ghost: "default-foreground",
  outline: "default-foreground",
  primary: "accent-foreground",
  secondary: "accent-soft-foreground",
  tertiary: "default-foreground",
};

const DYNAMIC_TYPE_LAYOUT: Record<ButtonSize, ViewStyle> = {
  lg: {
    height: "auto",
    minHeight: 56,
    paddingHorizontal: 36,
    paddingVertical: 14,
    position: "relative",
  },
  md: {
    height: "auto",
    minHeight: 48,
    paddingHorizontal: 32,
    paddingVertical: 12,
    position: "relative",
  },
  sm: {
    height: "auto",
    minHeight: 40,
    paddingHorizontal: 30,
    paddingVertical: 10,
    position: "relative",
  },
};

const LEADING_GAP: Record<ButtonSize, number> = { lg: 10, md: 8, sm: 6 };
const LEADING_SLOT: ViewStyle = {
  height: 16,
  position: "absolute",
  right: "100%",
  top: "50%",
  width: 16,
};

const LABEL_GROUP: ViewStyle = {
  alignItems: "center",
  flexShrink: 1,
  justifyContent: "center",
  position: "relative",
};

const LABEL_LAYOUT: TextStyle = {
  flexShrink: 1,
  textAlign: "center",
};

/**
 * The app's general React Native button.
 *
 * Pending is a state of the same action: the label and box stay in place while
 * the leading content becomes a spinner. Width remains a layout decision for
 * the parent or call site.
 */
export function Button({
  accessibilityState,
  children,
  isDisabled = false,
  isPending = false,
  onLayout,
  size = "md",
  startContent,
  style,
  variant = "primary",
  ...props
}: ButtonProps) {
  const spinnerColor = useThemeColor(SPINNER_COLOR[variant]);
  const effectiveDisabled = isDisabled || isPending;
  const idleSize = useRef<{ height: number; width: number } | undefined>(
    undefined
  );
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!isPending) {
        const { height, width } = event.nativeEvent.layout;

        idleSize.current = { height, width };
      }
      onLayout?.(event);
    },
    [isPending, onLayout]
  );
  const pendingSize = isPending ? idleSize.current : undefined;
  const resolvedStyle =
    typeof style === "function"
      ? (state: PressableStateCallbackType) => [
          DYNAMIC_TYPE_LAYOUT[size],
          style(state),
          pendingSize,
        ]
      : [DYNAMIC_TYPE_LAYOUT[size], style, pendingSize];

  return (
    <HeroButton
      {...props}
      accessibilityState={{
        ...accessibilityState,
        busy: isPending,
        disabled: effectiveDisabled,
      }}
      isDisabled={effectiveDisabled}
      onLayout={handleLayout}
      size={size}
      style={resolvedStyle}
      variant={variant}
    >
      <View style={LABEL_GROUP}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[
            LEADING_SLOT,
            {
              transform: [
                { translateX: -LEADING_GAP[size] },
                { translateY: -8 },
              ],
            },
          ]}
          testID="button-leading-content"
        >
          {isPending ? (
            <Spinner
              accessibilityRole={undefined}
              accessibilityState={undefined}
              accessible={false}
              color={spinnerColor}
              size="sm"
            />
          ) : (
            startContent
          )}
        </View>
        <HeroButton.Label style={LABEL_LAYOUT}>{children}</HeroButton.Label>
      </View>
    </HeroButton>
  );
}
