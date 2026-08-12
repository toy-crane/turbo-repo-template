import { Avatar } from "heroui-native/avatar";

/**
 * `xl` is this app's own step above HeroUI's three.
 *
 * The settings header shows the profile as the subject of the screen rather than
 * as a row's icon, and `lg` is 64pt — a list avatar. Both numbers come from the
 * project's spacing scale, so the picture still lines up with everything else.
 */
const XL_ROOT_CLASS = "h-24 w-24";
const XL_FALLBACK_TEXT_CLASS = "text-3xl";

export interface UserAvatarProps {
  avatarUrl: string | null;
  displayName: string | null;
  size?: "lg" | "md" | "sm" | "xl";
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
  const isExtraLarge = size === "xl";

  return (
    <Avatar
      alt={displayName ? `${displayName} 프로필 사진` : "프로필 사진"}
      className={isExtraLarge ? XL_ROOT_CLASS : undefined}
      color="accent"
      size={isExtraLarge ? "lg" : size}
      variant="soft"
    >
      {avatarUrl ? (
        <Avatar.Image source={{ uri: avatarUrl }} testID={testID} />
      ) : null}
      <Avatar.Fallback
        classNames={isExtraLarge ? { text: XL_FALLBACK_TEXT_CLASS } : undefined}
        testID={testID}
      >
        {toInitial(displayName)}
      </Avatar.Fallback>
    </Avatar>
  );
}
