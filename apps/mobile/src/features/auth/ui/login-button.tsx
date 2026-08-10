import { useCallback } from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";

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

export type LoginProvider = "apple" | "email" | "google";

export function LoginButton({
  isDisabled,
  label,
  onPress,
  provider,
  testID,
}: {
  isDisabled?: boolean;
  label: string;
  onPress: () => void;
  provider: LoginProvider;
  testID?: string;
}) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const colors = COLORS[scheme];
  const backgroundColor = provider === "apple" ? colors.appleFill : colors.fill;
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
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={style}
      testID={testID}
    >
      {provider === "google" ? <GoogleMark /> : null}
      {provider === "apple" ? <AppleMark color={colors.text} /> : null}
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Keeps the three buttons an even stack the screen can drop into its footer. */
export function LoginButtonStack({ children }: { children: React.ReactNode }) {
  return <View className="gap-2.5">{children}</View>;
}
