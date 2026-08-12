import { Pressable } from "react-native";

import {
  readProfileAvatarUrl,
  useProfile,
} from "@/features/auth/query/profile";
import { useAuthSession } from "@/features/auth/state/auth-session";
import { UserAvatar } from "@/shared/ui/user-avatar";

/**
 * The Home toolbar's way into Settings.
 *
 * Home is where the session meets the profile, so this is the piece that turns
 * a signed-in user into the picture the shared avatar draws.
 */
export function ProfileAvatarButton({ onPress }: { onPress: () => void }) {
  const { session } = useAuthSession();
  const { data: profile } = useProfile(session?.user.id);

  return (
    <Pressable
      accessibilityHint="Opens Settings as a sheet"
      accessibilityLabel="Open settings"
      accessibilityRole="button"
      onPress={onPress}
    >
      <UserAvatar
        avatarUrl={readProfileAvatarUrl(profile)}
        displayName={profile?.displayName ?? null}
      />
    </Pressable>
  );
}
