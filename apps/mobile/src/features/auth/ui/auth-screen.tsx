import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The shape all three sign-in screens share: what to do at the top, the main
 * action at the bottom.
 *
 * The footer rides on `KeyboardStickyView`, which moves it with the keyboard
 * rather than resizing anything around it. React Native's own
 * `KeyboardAvoidingView` compares its measured frame against the keyboard's
 * position on screen, and inside a native stack the header throws that
 * comparison off, so the footer stayed under the keyboard. Expo's keyboard
 * guide names this library for anything past a prototype.
 */

const BOTTOM_PADDING = 12;
const SIDE_PADDING = 24;
const TOP_PADDING = 16;

export function AuthScreen({
  children,
  footer,
  isRoot,
  subtitle,
  title,
}: {
  children?: ReactNode;
  footer: ReactNode;
  /**
   * True for the first screen of the stack, which shows no native header.
   * Without a header there is nothing holding the title clear of the status
   * bar, so this screen has to keep that space itself.
   */
  isRoot?: boolean;
  subtitle?: ReactNode;
  title: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-1 gap-4 px-6 pt-2"
        style={isRoot ? { paddingTop: insets.top + TOP_PADDING } : undefined}
      >
        <View className="gap-2.5 pt-2">
          <Text className="font-bold text-3xl text-foreground">{title}</Text>
          {subtitle}
        </View>
        {children}
      </View>

      {/*
        The home indicator's space is the keyboard's while it is up, so the
        safe-area inset only applies when the keyboard is closed.
      */}
      <KeyboardStickyView
        offset={{ closed: 0, opened: BOTTOM_PADDING - insets.bottom }}
      >
        <View
          className="gap-2.5 pt-3"
          style={{
            paddingBottom: Math.max(insets.bottom, BOTTOM_PADDING),
            paddingLeft: SIDE_PADDING,
            paddingRight: SIDE_PADDING,
          }}
        >
          {footer}
        </View>
      </KeyboardStickyView>
    </View>
  );
}

/** The line under the title. Uses `muted`, which is the name the theme defines. */
export function AuthSubtitle({ children }: { children: ReactNode }) {
  return <Text className="text-base text-muted leading-6">{children}</Text>;
}

export function AuthError({
  children,
  testID,
}: {
  children: ReactNode;
  testID: string;
}) {
  return (
    <Text
      accessibilityRole="alert"
      className="font-medium text-danger text-sm"
      testID={testID}
    >
      {children}
    </Text>
  );
}

/**
 * Splits the two provider buttons from the email one.
 *
 * They are different kinds of choice: the first two hand the account to Google
 * or Apple, the third stays here. Without the rule the three read as one list
 * where any button could be any of those things.
 */
export function AuthDivider() {
  return (
    <View className="flex-row items-center gap-3 py-1">
      <View className="h-px flex-1 bg-border" />
      <Text className="text-muted text-sm">또는</Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}
