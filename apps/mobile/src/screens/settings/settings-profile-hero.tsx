import { Pressable, Text, View } from "react-native";

import { profileLabels } from "@/features/auth/ui/profile-labels";
import { UserAvatar } from "@/shared/ui/user-avatar";

export interface SettingsProfileHeroProps {
  avatarUrl: string | null;
  displayName: string | null;
  onPress: () => void;
  username: string | null;
}

/**
 * The profile at the top of Settings: the picture, the nickname, the account id.
 *
 * The picture is the control and the two lines below it are not. Pressing it
 * opens 프로필 rather than a photo menu, so the picture and the 프로필 row lead
 * to the same place and a change to any part of the public profile is saved or
 * abandoned as one.
 *
 * No `@` in front of the id: `@` means a mention or an address, and this app has
 * neither, so it would promise something that does not exist.
 *
 * Spacing comes from the project's scale rather than from the sheet's native
 * metrics. This layout is the app's own; the sections below it belong to the
 * platform and keep theirs.
 */
export function SettingsProfileHero({
  avatarUrl,
  displayName,
  onPress,
  username,
}: SettingsProfileHeroProps) {
  return (
    <View className="w-full items-center gap-3 pt-2 pb-6">
      <Pressable
        accessibilityLabel={profileLabels.profile}
        accessibilityRole="button"
        onPress={onPress}
        testID="settings-profile-photo"
      >
        <UserAvatar
          avatarUrl={avatarUrl}
          displayName={displayName}
          size="xl"
          transparentPhotoBackground
        />
      </Pressable>

      <View className="items-center gap-1">
        {/*
          The nickname is what a person recognises, so it carries the weight and
          the id sits under it as the quieter of the two. Both wrap and centre
          rather than truncate: a 20 character id and a 30 character nickname are
          both allowed, and cutting one off hides part of what the screen exists
          to show.
        */}
        <Text
          className="text-center font-bold text-2xl text-foreground"
          testID="settings-profile-name"
        >
          {displayName}
        </Text>
        <Text
          className="text-center text-base text-muted"
          testID="settings-profile-username"
        >
          {username}
        </Text>
      </View>
    </View>
  );
}
