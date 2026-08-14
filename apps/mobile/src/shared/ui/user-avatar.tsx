import { Avatar } from "heroui-native/avatar";
import { useCallback, useState } from "react";

/**
 * `xl` is this app's own step above HeroUI's three.
 *
 * The settings header shows the profile as the subject of the screen rather than
 * as a row's icon, and `lg` is 64pt — a list avatar. Both numbers come from the
 * project's spacing scale, so the picture still lines up with everything else.
 */
const XL_ROOT_CLASS = "h-24 w-24";
const XL_FALLBACK_TEXT_CLASS = "text-3xl";
/** A profile picture is a circle everywhere it appears, not a rounded square. */
const CIRCLE_CLASS = "rounded-full";
/** An uploaded picture supplies every visible pixel inside the circle. */
const PHOTO_ROOT_CLASS = "bg-transparent";

export interface UserAvatarProps {
  avatarUrl: string | null;
  displayName: string | null;
  size?: "lg" | "md" | "sm" | "xl";
  testID?: string;
  /** Removes the app-supplied colour only while the photo is visible. */
  transparentPhotoBackground?: boolean;
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
  transparentPhotoBackground = false,
}: UserAvatarProps) {
  const isExtraLarge = size === "xl";
  const [loadedPhotoUrl, setLoadedPhotoUrl] = useState<string | null>(null);
  const showsTransparentPhoto =
    transparentPhotoBackground &&
    avatarUrl !== null &&
    loadedPhotoUrl === avatarUrl;
  const handlePhotoError = useCallback(() => {
    setLoadedPhotoUrl(null);
  }, []);
  const handlePhotoLoad = useCallback(() => {
    setLoadedPhotoUrl(avatarUrl);
  }, [avatarUrl]);
  const rootClassName = [
    isExtraLarge ? XL_ROOT_CLASS : undefined,
    CIRCLE_CLASS,
    showsTransparentPhoto ? PHOTO_ROOT_CLASS : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Avatar
      alt={displayName ? `${displayName} 프로필 사진` : "프로필 사진"}
      background={showsTransparentPhoto ? null : undefined}
      className={rootClassName}
      color="accent"
      size={isExtraLarge ? "lg" : size}
      testID={testID}
      variant="soft"
    >
      {avatarUrl ? (
        <Avatar.Image
          onError={handlePhotoError}
          onLoad={handlePhotoLoad}
          source={{ uri: avatarUrl }}
        />
      ) : null}
      <Avatar.Fallback
        classNames={isExtraLarge ? { text: XL_FALLBACK_TEXT_CLASS } : undefined}
      >
        {toInitial(displayName)}
      </Avatar.Fallback>
    </Avatar>
  );
}
