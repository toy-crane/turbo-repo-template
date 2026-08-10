import { Stack } from "expo-router";

import { useAppTheme } from "@/core/theme/app-theme-bridge";

/**
 * The auth stack.
 *
 * The first screen has no header: it is the root of the stack and there is
 * nowhere to go back to. The two steps after it show the native header, which
 * is what owns the back control — the screens do not draw one of their own.
 * Titles stay empty because each screen states its own job in a large heading.
 */
/**
 * Anchors the stack to the first screen, so anything that opens `email` or
 * `code` directly — a deep link, a redirect, a restored navigation state —
 * still has the method screen beneath it. Without this the back chevron has
 * nowhere to go and Google and Apple become unreachable.
 */
export const unstable_settings = { anchor: "sign-in" };

export default function AuthLayout() {
  const { background } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: background },
        // "minimal" is UIKit's own back-button mode: the chevron with no label.
        // The label would name the screen behind, which repeats what the
        // heading on this one already says.
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: background },
        headerTitle: "",
      }}
    >
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="email" />
      <Stack.Screen name="code" />
    </Stack>
  );
}
