import { Avatar } from "heroui-native/avatar";
import { Pressable } from "react-native";

interface InitialAvatarProps {
  initial: string;
  onPress: () => void;
}

export function InitialAvatar({ initial, onPress }: InitialAvatarProps) {
  return (
    <Pressable
      accessibilityHint="Opens Settings as a sheet"
      accessibilityLabel="Open settings"
      accessibilityRole="button"
      onPress={onPress}
    >
      <Avatar
        alt={`${initial} profile`}
        color="accent"
        size="sm"
        variant="soft"
      >
        <Avatar.Fallback>{initial}</Avatar.Fallback>
      </Avatar>
    </Pressable>
  );
}
