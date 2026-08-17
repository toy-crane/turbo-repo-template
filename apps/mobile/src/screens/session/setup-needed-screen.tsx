import { ScrollView, Text, View } from "react-native";

/**
 * What the app shows when Supabase was never configured.
 *
 * Kept apart from the signed-out state on purpose: the sign-in screen would
 * invite someone to type credentials that cannot reach anything. This screen is
 * for whoever set the project up, so it shows the raw message rather than
 * softening it into product copy.
 */
export function SetupNeededScreen({ problem }: { problem: string }) {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="flex-1 justify-center gap-3 px-6"
      testID="setup-needed"
    >
      <View className="gap-3">
        <Text
          accessibilityRole="header"
          className="font-bold text-2xl text-foreground"
        >
          앱 설정이 끝나지 않았어요
        </Text>
        <Text className="text-base text-muted leading-6" selectable>
          {problem}
        </Text>
      </View>
    </ScrollView>
  );
}
