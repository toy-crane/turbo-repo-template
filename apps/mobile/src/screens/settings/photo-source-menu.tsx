import { BottomSheet, ListItem, Text } from "@expo/ui";
import { useCallback, useState } from "react";
import { ActionSheetIOS, Platform } from "react-native";

import { profileLabels } from "@/features/auth/ui/profile-labels";

export interface PhotoSourceActions {
  /** Left out of the menu when there is no picture to delete. */
  hasPhoto: boolean;
  onDeletePhoto: () => void;
  onPickFromLibrary: () => void;
  onTakePhoto: () => void;
}

export interface PhotoSourceMenu {
  close: () => void;
  isPresented: boolean;
  open: () => void;
}

interface PhotoChoice {
  label: string;
  run: () => void;
}

/**
 * Builds the menu in the order the decision fixes, skipping 현재 사진 삭제 when
 * there is nothing to delete — offering it against an empty picture would be a
 * control that does nothing.
 */
function buildChoices({
  hasPhoto,
  onDeletePhoto,
  onPickFromLibrary,
  onTakePhoto,
}: PhotoSourceActions): PhotoChoice[] {
  const choices: PhotoChoice[] = [
    { label: profileLabels.takePhoto, run: onTakePhoto },
    { label: profileLabels.pickFromLibrary, run: onPickFromLibrary },
  ];

  if (hasPhoto) {
    choices.push({ label: profileLabels.deletePhoto, run: onDeletePhoto });
  }

  return choices;
}

/**
 * Where a new profile picture comes from.
 *
 * Each platform gets its own presentation because each has one: iOS answers this
 * question with an action sheet and Android with a bottom sheet, and the menu is
 * a transient choice rather than part of the settings tree. The screen calls
 * `open()` either way and never learns which one appeared.
 */
export function usePhotoSourceMenu(
  actions: PhotoSourceActions
): PhotoSourceMenu {
  const [isPresented, setIsPresented] = useState(false);

  const close = useCallback(() => {
    setIsPresented(false);
  }, []);

  // Rebuilt on every render rather than memoised: the entries depend on whether
  // there is a picture right now, and the sheet is handed its labels once, at
  // the moment it opens.
  const open = () => {
    if (Platform.OS !== "ios") {
      setIsPresented(true);

      return;
    }

    const choices = buildChoices(actions);
    const options = [
      ...choices.map((choice) => choice.label),
      profileLabels.cancel,
    ];

    ActionSheetIOS.showActionSheetWithOptions(
      {
        cancelButtonIndex: options.length - 1,
        // Deleting a picture is the one entry that removes something, so it is
        // the one drawn in red. 변경 elsewhere is not, because it replaces.
        destructiveButtonIndex: actions.hasPhoto
          ? choices.length - 1
          : undefined,
        options,
      },
      (index) => {
        choices[index]?.run();
      }
    );
  };

  return { close, isPresented, open };
}

/** One entry of the Android sheet. Its own component so the press stays stable. */
function PhotoSourceRow({
  choice,
  onChosen,
}: {
  choice: PhotoChoice;
  onChosen: () => void;
}) {
  const press = useCallback(() => {
    onChosen();
    choice.run();
  }, [choice, onChosen]);

  return (
    <ListItem onPress={press} testID={`photo-source-${choice.label}`}>
      <Text>{choice.label}</Text>
    </ListItem>
  );
}

/**
 * The Android half of the menu. Draws nothing on iOS, where the OS already put
 * an action sheet on screen.
 */
export function PhotoSourceSheet({
  actions,
  menu,
}: {
  actions: PhotoSourceActions;
  menu: PhotoSourceMenu;
}) {
  if (Platform.OS === "ios") {
    return null;
  }

  return (
    <BottomSheet isPresented={menu.isPresented} onDismiss={menu.close}>
      {buildChoices(actions).map((choice) => (
        <PhotoSourceRow
          choice={choice}
          key={choice.label}
          onChosen={menu.close}
        />
      ))}
    </BottomSheet>
  );
}
