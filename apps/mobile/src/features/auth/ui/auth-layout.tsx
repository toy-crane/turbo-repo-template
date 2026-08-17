import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
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
const TOP_PADDING = 16;

export function AuthLayout({
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
      {/*
        A scroll view rather than a fixed box: at large Dynamic Type or on a
        short device the title, subtitle and input can outgrow the space left
        above the keyboard, and without this the overflow is simply unreachable.
        `keyboardDismissMode="on-drag"` is also the only way off a numeric
        keypad, which has no dismiss key of its own.
      */}
      <ScrollView
        className="flex-1"
        contentContainerClassName={isRoot ? "gap-4 px-6" : "gap-4 px-6 pt-2"}
        contentContainerStyle={
          isRoot ? { paddingTop: insets.top + TOP_PADDING } : undefined
        }
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2.5 pt-2">
          <Text className="font-bold text-3xl text-foreground">{title}</Text>
          {subtitle}
        </View>
        {children}
      </ScrollView>

      {/*
        The footer keeps the home indicator's space as bottom padding, which is
        only wanted while the keyboard is down. Once it is up the keyboard owns
        that strip, so the offset gives the padding back: the component adds it
        to a translateY that is already negative, so a positive number moves the
        footer back down toward the keyboard.
      */}
      <KeyboardStickyView
        offset={{
          closed: 0,
          opened: Math.max(insets.bottom, BOTTOM_PADDING) - BOTTOM_PADDING,
        }}
      >
        <View
          className="gap-2.5 px-6 pt-3"
          style={{
            paddingBottom: Math.max(insets.bottom, BOTTOM_PADDING),
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
