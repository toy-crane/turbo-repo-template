import { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  useColorScheme,
} from "react-native";

import { AppleMark, GoogleMark } from "./brand-marks";

/**
 * The one button shape all three login choices use.
 *
 * The colours are not app tokens. Google publishes the fill, stroke and text
 * colour for its button, and Apple allows only a black or white background with
 * a matching mark. Following both leaves three buttons that look like one set,
 * because Google's dark fill and Apple's black differ by less than the eye can
 * see. The email button borrows Google's values so the set stays even.
 *
 * https://developers.google.com/identity/branding-guidelines
 */

const BUTTON_HEIGHT = 54;
const PRESSED_OPACITY = 0.75;

const COLORS = {
  dark: {
    appleFill: "#000000",
    fill: "#131314",
    stroke: "#8E918F",
    text: "#E3E3E3",
  },
  light: {
    appleFill: "#FFFFFF",
    fill: "#FFFFFF",
    stroke: "#747775",
    text: "#1F1F1F",
  },
} as const;

export type SignInMethod = "apple" | "email" | "google";

export function SignInButton({
  isBusy,
  isDisabled,
  label,
  onPress,
  method,
  testID,
}: {
  /** True while THIS button's sign-in is running, not any sibling's. */
  isBusy?: boolean;
  isDisabled?: boolean;
  label: string;
  onPress: () => void;
  method: SignInMethod;
  testID?: string;
}) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const colors = COLORS[scheme];
  const backgroundColor = method === "apple" ? colors.appleFill : colors.fill;
  const style = useCallback(
    ({ pressed }: { pressed: boolean }) => ({
      alignItems: "center" as const,
      backgroundColor,
      borderColor: colors.stroke,
      borderRadius: BUTTON_HEIGHT / 2,
      borderWidth: 1,
      flexDirection: "row" as const,
      gap: 10,
      height: BUTTON_HEIGHT,
      justifyContent: "center" as const,
      opacity: pressed || isDisabled ? PRESSED_OPACITY : 1,
      width: "100%" as const,
    }),
    [backgroundColor, colors.stroke, isDisabled]
  );

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: isBusy, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={style}
      testID={testID}
    >
      {isBusy ? <ActivityIndicator color={colors.text} size="small" /> : null}
      {method === "google" && !isBusy ? <GoogleMark /> : null}
      {method === "apple" && !isBusy ? (
        <AppleMark tone={scheme === "dark" ? "white" : "black"} />
      ) : null}
      {/*
        The row is a fixed height, so the label has to stay inside it. Without
        the cap and the shrink, a large system text size pushes the text past
        the rounded border instead of fitting.
      */}
      <Text
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.6}
        numberOfLines={1}
        style={{
          color: colors.text,
          flexShrink: 1,
          fontSize: 16,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
