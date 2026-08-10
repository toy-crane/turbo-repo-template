import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The shape all three sign-in screens share: what to do at the top, the main
 * action at the bottom.
 *
 * The footer is a sibling of the body rather than the end of a scroll view, so
 * the keyboard pushes it up instead of covering it. That was the whole reason
 * the old single screen hid its own submit button.
 */

const BOTTOM_PADDING = 12;
const SIDE_PADDING = 24;

export function AuthScreen({
  children,
  footer,
  subtitle,
  title,
}: {
  children?: ReactNode;
  footer: ReactNode;
  subtitle?: ReactNode;
  title: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
      style={{ flex: 1 }}
    >
      <View className="flex-1 gap-4 px-6 pt-2">
        <View className="gap-2.5 pt-2">
          <Text className="font-bold text-3xl text-foreground">{title}</Text>
          {subtitle}
        </View>
        {children}
      </View>

      <View
        className="gap-2.5 px-6 pt-3"
        style={{
          paddingBottom: Math.max(insets.bottom, BOTTOM_PADDING),
          paddingLeft: SIDE_PADDING,
          paddingRight: SIDE_PADDING,
        }}
      >
        {footer}
      </View>
    </KeyboardAvoidingView>
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
