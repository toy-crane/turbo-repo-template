import {
  type ButtonRootProps,
  type ButtonVariant,
  Button as HeroButton,
} from "heroui-native/button";
import { type ThemeColor, useThemeColor } from "heroui-native/hooks";
import { Spinner } from "heroui-native/spinner";
import type { ReactNode } from "react";

type OmitButtonState<T> = T extends ButtonRootProps
  ? Omit<T, "children" | "isDisabled">
  : never;

export type ButtonProps = OmitButtonState<ButtonRootProps> & {
  children: ReactNode;
  isDisabled?: boolean;
  isPending?: boolean;
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
  startContent,
  variant = "primary",
  ...props
}: ButtonProps) {
  const spinnerColor = useThemeColor(SPINNER_COLOR[variant]);
  const effectiveDisabled = isDisabled || isPending;

  return (
    <HeroButton
      {...props}
      accessibilityState={{
        ...accessibilityState,
        busy: isPending,
        disabled: effectiveDisabled,
      }}
      isDisabled={effectiveDisabled}
      variant={variant}
    >
      {isPending ? (
        <Spinner
          accessibilityElementsHidden
          accessibilityRole={undefined}
          accessibilityState={undefined}
          accessible={false}
          color={spinnerColor}
          importantForAccessibility="no-hide-descendants"
          size="sm"
        />
      ) : (
        startContent
      )}
      <HeroButton.Label>{children}</HeroButton.Label>
    </HeroButton>
  );
}
