import { Pressable, Text, View } from "react-native";

import { profileLabels } from "@/features/auth/ui/profile-labels";
import { UserAvatar } from "@/shared/ui/user-avatar";

export interface ProfileEditHeroProps {
  avatarUrl: string | null;
  displayName: string | null;
  onEditPhoto: () => void;
}

/**
 * The picture at the top of 프로필 수정, and the control under it.
 *
 * Two targets, one action: the picture and the 편집 pill open the same menu. The
 * pill is the platform's own shape for this — iOS puts one under the photo in
 * Contacts and the Apple account screen — and it is what tells people the
 * picture can be changed at all. Nothing is drawn on top of the picture: a badge
 * would put a second target over the first and cover part of what it offers to
 * change.
 */
export function ProfileEditHero({
  avatarUrl,
  displayName,
  onEditPhoto,
}: ProfileEditHeroProps) {
  return (
    <View className="items-center gap-2 px-4 pt-2 pb-6">
      <Pressable
        accessibilityLabel={profileLabels.changePhoto}
        accessibilityRole="button"
        onPress={onEditPhoto}
        testID="profile-edit-photo"
      >
        <UserAvatar avatarUrl={avatarUrl} displayName={displayName} size="xl" />
      </Pressable>

      {/*
        The accessible name is the full 사진 편집 even though the pill reads 편집.
        On screen the picture above it supplies the subject; a screen reader
        arrives at the control alone and needs to hear what it edits.
      */}
      <Pressable
        accessibilityLabel={profileLabels.changePhoto}
        accessibilityRole="button"
        className="rounded-full bg-surface px-4 py-1.5"
        onPress={onEditPhoto}
        testID="profile-edit-photo-label"
      >
        <Text className="font-semibold text-base text-foreground">
          {profileLabels.edit}
        </Text>
      </Pressable>
    </View>
  );
}
