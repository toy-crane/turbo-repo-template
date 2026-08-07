import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

import { getSemanticColors } from "../theme/semantic-colors";

interface TabStackProps {
  routeName: string;
  title: string;
}

export function TabStack({ routeName, title }: TabStackProps) {
  const colors = getSemanticColors(useColorScheme());

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background.canvas },
        headerStyle: { backgroundColor: colors.background.canvas },
      }}
    >
      <Stack.Screen
        name={routeName}
        options={{
          headerLargeTitle: true,
          title,
        }}
      />
    </Stack>
  );
}
