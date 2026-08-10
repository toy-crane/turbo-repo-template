import { type ReactNode, useEffect, useState } from "react";
import { Keyboard, Platform, Text, View } from "react-native";
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
const TOP_PADDING = 16;

/**
 * How much of the screen the keyboard is covering.
 *
 * `KeyboardAvoidingView` is the usual answer, but inside a native stack screen
 * it measures its own frame against the keyboard's window position and the
 * header throws that comparison off, so the footer stayed put. The height on
 * its own needs no such comparison: this container ends at the bottom of the
 * screen, so padding it by the keyboard's height lifts the footer to exactly
 * the keyboard's top whether or not the screen has a header.
 */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // iOS reports the frame before the animation so the footer travels with the
    // keyboard; Android only has the "did" events.
    const isIOS = Platform.OS === "ios";
    const shown = Keyboard.addListener(
      isIOS ? "keyboardWillShow" : "keyboardDidShow",
      (event) => setHeight(event.endCoordinates.height)
    );
    const hidden = Keyboard.addListener(
      isIOS ? "keyboardWillHide" : "keyboardDidHide",
      () => setHeight(0)
    );

    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return height;
}

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
  const keyboardHeight = useKeyboardHeight();

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingBottom: keyboardHeight }}
    >
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

      <View
        className="gap-2.5 px-6 pt-3"
        style={{
          // The keyboard takes over the home indicator's space while it is up,
          // so the safe-area inset would only add a gap under the button.
          paddingBottom: keyboardHeight
            ? BOTTOM_PADDING
            : Math.max(insets.bottom, BOTTOM_PADDING),
          paddingLeft: SIDE_PADDING,
          paddingRight: SIDE_PADDING,
        }}
      >
        {footer}
      </View>
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
