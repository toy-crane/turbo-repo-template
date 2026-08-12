import { Pressable, Text, View } from "react-native";

import { profileLabels } from "@/features/auth/ui/profile-labels";
import { UserAvatar } from "@/shared/ui/user-avatar";

export interface EditableProfileHeroProps {
  avatarUrl: string | null;
  displayName: string | null;
  onEditPhoto: () => void;
}

/**
 * The picture at the top of 프로필 수정, and the words under it.
 *
 * Two controls, one action: pressing the picture and pressing 사진 편집 open the
 * same menu. Nothing is drawn on top of the picture — no pencil, no badge. The
 * words already say what pressing does, and a badge would put a second target
 * over the first while hiding part of the photo it is offering to change.
 */
export function EditableProfileHero({
  avatarUrl,
  displayName,
  onEditPhoto,
}: EditableProfileHeroProps) {
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

      <Pressable
        accessibilityRole="button"
        onPress={onEditPhoto}
        testID="profile-edit-photo-label"
      >
        <Text className="font-semibold text-accent text-base">
          {profileLabels.changePhoto}
        </Text>
      </Pressable>
    </View>
  );
}
