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
export default function AuthLayout() {
  const { background } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: background },
        headerTitle: "",
      }}
    >
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="email" options={{ headerBackTitle: "로그인" }} />
      <Stack.Screen name="code" options={{ headerBackTitle: "이메일" }} />
    </Stack>
  );
}
