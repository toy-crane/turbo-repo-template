import { Stack } from "expo-router";

import { useAppTheme } from "../../src/theme/app-theme-bridge";

export default function AuthLayout() {
  const { background } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: background },
        headerShown: false,
      }}
    />
  );
}
