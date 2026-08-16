import {
  type ButtonRootProps,
  type ButtonSize,
  type ButtonVariant,
  Button as HeroButton,
} from "heroui-native/button";
import { type ThemeColor, useThemeColor } from "heroui-native/hooks";
import { cn } from "heroui-native/utils";
import { type ReactNode, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  type PressableStateCallbackType,
  View,
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

const DYNAMIC_TYPE_CLASS_NAME: Record<
  ButtonSize,
  { idle: string; pending: string }
> = {
  lg: {
    idle: "relative h-auto! min-h-14 px-9! py-3.5",
    pending: "relative min-h-14 px-9! py-3.5",
  },
  md: {
    idle: "relative h-auto! min-h-12 px-8! py-3",
    pending: "relative min-h-12 px-8! py-3",
  },
  sm: {
    idle: "relative h-auto! min-h-10 px-[30px]! py-2.5",
    pending: "relative min-h-10 px-[30px]! py-2.5",
  },
};

const LEADING_SLOT_CLASS_NAME: Record<ButtonSize, string> = {
  lg: "absolute right-full top-1/2 size-4 -translate-x-2.5 -translate-y-2",
  md: "absolute right-full top-1/2 size-4 -translate-x-2 -translate-y-2",
  sm: "absolute right-full top-1/2 size-4 -translate-x-1.5 -translate-y-2",
};

function getDynamicTypeClassName(
  size: ButtonSize,
  pendingSize: { height: number; width: number } | undefined
) {
  return pendingSize
    ? DYNAMIC_TYPE_CLASS_NAME[size].pending
    : DYNAMIC_TYPE_CLASS_NAME[size].idle;
}

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
  className,
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
  const dynamicTypeClassName = getDynamicTypeClassName(size, pendingSize);
  const resolvedStyle =
    typeof style === "function"
      ? (state: PressableStateCallbackType) => [style(state), pendingSize]
      : [style, pendingSize];

  return (
    <HeroButton
      {...props}
      accessibilityState={{
        ...accessibilityState,
        busy: isPending,
        disabled: effectiveDisabled,
      }}
      className={cn(dynamicTypeClassName, className)}
      isDisabled={effectiveDisabled}
      onLayout={handleLayout}
      size={size}
      style={resolvedStyle}
      variant={variant}
    >
      <View className="relative shrink items-center justify-center">
        <View
          accessibilityElementsHidden
          className={LEADING_SLOT_CLASS_NAME[size]}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          testID="button-leading-content"
        >
          {isPending ? (
            <ActivityIndicator color={spinnerColor} size="small" />
          ) : (
            startContent
          )}
        </View>
        <HeroButton.Label className="shrink text-center">
          {children}
        </HeroButton.Label>
      </View>
    </HeroButton>
  );
}
