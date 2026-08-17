import { ScrollView, Text, View } from "react-native";

import { Button } from "@/shared/ui/button";

/**
 * What the app shows when the session is good but the profile could not be
 * read.
 *
 * This is not the signed-out state and must not be treated as one. The person's
 * credentials are fine; one request failed. Sending them back to sign in would
 * cost them a working session and would not fix anything, so the screen holds
 * still and offers the read again.
 */
export function ProfileUnavailableScreen({
  isRetrying,
  onRetry,
}: {
  isRetrying: boolean;
  onRetry: () => void;
}) {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="flex-1 justify-center gap-6 px-6"
      testID="profile-unavailable"
    >
      <View className="gap-3">
        <Text
          accessibilityRole="header"
          className="font-bold text-2xl text-foreground"
        >
          잠시 후 다시 시도해 주세요
        </Text>
        <Text className="text-base text-muted leading-6">
          프로필을 불러오지 못했어요.
        </Text>
      </View>

      <Button
        accessibilityLabel="프로필 다시 불러오기"
        isPending={isRetrying}
        onPress={onRetry}
      >
        프로필 다시 불러오기
      </Button>
    </ScrollView>
  );
}
