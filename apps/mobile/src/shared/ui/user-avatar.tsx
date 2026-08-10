import { Avatar } from "heroui-native/avatar";

export interface UserAvatarProps {
  avatarUrl: string | null;
  displayName: string | null;
  size?: "lg" | "md" | "sm";
  testID?: string;
}

/**
 * Reads the first letter as a grapheme, so a name that starts with an emoji or
 * a surrogate pair does not come back as half a character.
 */
function toInitial(displayName: string | null): string | undefined {
  const name = displayName?.trim();

  return name ? [...name][0]?.toUpperCase() : undefined;
}

/**
 * A person's picture, the first letter of their name, or a person icon.
 *
 * Presentational only: whoever renders it decides where the values come from
 * and whether it can be pressed. HeroUI hides the fallback as soon as the
 * source is usable, so the letter shows exactly when there is no picture.
 */
export function UserAvatar({
  avatarUrl,
  displayName,
  size = "sm",
  testID,
}: UserAvatarProps) {
  return (
    <Avatar
      alt={displayName ? `${displayName} 프로필 사진` : "프로필 사진"}
      color="accent"
      size={size}
      variant="soft"
    >
      {avatarUrl ? (
        <Avatar.Image source={{ uri: avatarUrl }} testID={testID} />
      ) : null}
      <Avatar.Fallback testID={testID}>
        {toInitial(displayName)}
      </Avatar.Fallback>
    </Avatar>
  );
}
