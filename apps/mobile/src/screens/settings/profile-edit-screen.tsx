import {
  Button,
  Column,
  FieldGroup,
  Host,
  RNHostView,
  Row,
  Text,
  TextInput,
  useNativeState,
} from "@expo/ui";
import { useCallback } from "react";
import { Alert } from "react-native";

import {
  NICKNAME_MAX_LENGTH,
  normalizeUsernameInput,
  USERNAME_MAX_LENGTH,
} from "@/features/auth/state/profile-identity";
import { usePhotoSource } from "@/features/auth/state/use-photo-source";
import { useProfileEdit } from "@/features/auth/state/use-profile-edit";
import {
  CAMERA_DENIED_MESSAGE,
  profileLabels,
  USERNAME_CONFIRM_BODY,
  USERNAME_CONFIRM_TITLE,
} from "@/features/auth/ui/profile-labels";
import { EditableProfileHero } from "./editable-profile-hero";
import { heroRowModifiers } from "./hero-row";
import {
  type PhotoSourceActions,
  PhotoSourceSheet,
  usePhotoSourceMenu,
} from "./photo-source-menu";

/**
 * Everything 프로필 수정 does, assembled from the draft, the pickers and the
 * menu.
 *
 * The route needs `canSave` and `save` for the toolbar and the screen needs the
 * rest, so the assembly happens here and both read the same object rather than
 * each building half of it.
 */
export function useProfileEditFlow(onSaved: () => void) {
  const edit = useProfileEdit(onSaved);
  const photoSource = usePhotoSource();

  const takePhoto = useCallback(async () => {
    const choice = await photoSource.takePhoto();

    if (choice) {
      edit.setPhoto(choice.photo, choice.uri);
    }
  }, [edit.setPhoto, photoSource.takePhoto]);

  const pickFromLibrary = useCallback(async () => {
    const choice = await photoSource.pickFromLibrary();

    if (choice) {
      edit.setPhoto(choice.photo, choice.uri);
    }
  }, [edit.setPhoto, photoSource.pickFromLibrary]);

  const menuActions: PhotoSourceActions = {
    hasPhoto: edit.hasPhoto,
    onDeletePhoto: edit.deletePhoto,
    onPickFromLibrary: pickFromLibrary,
    onTakePhoto: takePhoto,
  };
  const menu = usePhotoSourceMenu(menuActions);

  /**
   * Asked only when the id is actually changing.
   *
   * 변경 carries no destructive style: it replaces a value rather than removing
   * one, and colouring it red would say the person is about to lose something.
   */
  const save = useCallback(() => {
    edit.save((proceed) => {
      Alert.alert(USERNAME_CONFIRM_TITLE, USERNAME_CONFIRM_BODY, [
        { style: "cancel", text: profileLabels.cancel },
        { onPress: proceed, text: profileLabels.confirmChange },
      ]);
    });
  }, [edit.save]);

  return {
    cameraDeniedMessage: photoSource.isCameraDenied
      ? CAMERA_DENIED_MESSAGE
      : undefined,
    edit,
    menu,
    menuActions,
    save,
  };
}

export type ProfileEditFlow = ReturnType<typeof useProfileEditFlow>;

/**
 * One screen for the whole public profile: the picture, the nickname and the
 * account id, saved or abandoned together.
 *
 * The explanation under the fields sits in `FieldGroup.SectionFooter` so it gets
 * the spacing each platform gives a section footer. No margin is set on it here;
 * a number picked in the app would be the one thing on this screen that did not
 * match the surrounding settings.
 */
export function ProfileEditScreen({ flow }: { flow: ProfileEditFlow }) {
  const { cameraDeniedMessage, edit, menu, menuActions } = flow;
  // The native fields hold their own text and report changes back. These carry
  // the two writes that do not come from typing: the saved values this screen
  // opens with, and a suggestion the person pressed.
  const nicknameField = useNativeState(edit.nickname);
  const usernameField = useNativeState(edit.username);

  const changeUsername = useCallback(
    (text: string) => {
      const normalized = normalizeUsernameInput(text);

      // A capital is corrected in the field rather than only on its way to the
      // server, so what the person sees is what gets saved. Everything else they
      // type is left alone and answered by the message below instead.
      if (normalized !== text) {
        usernameField.value = normalized;
      }

      edit.changeUsername(text);
    },
    [edit.changeUsername, usernameField]
  );

  const chooseSuggestion = useCallback(
    (candidate: string) => {
      usernameField.value = candidate;
      edit.chooseSuggestion(candidate);
    },
    [edit.chooseSuggestion, usernameField]
  );

  return (
    <Host style={{ flex: 1 }} useViewportSizeMeasurement>
      <FieldGroup testID="profile-edit-field-group">
        <RNHostView matchContents modifiers={heroRowModifiers}>
          <EditableProfileHero
            avatarUrl={edit.avatarUrl}
            displayName={edit.nickname}
            onEditPhoto={menu.open}
          />
        </RNHostView>

        <FieldGroup.Section title={profileLabels.publicProfile}>
          {/*
            No spacer between the label and the field: in a native form row the
            field already takes what the label leaves, and a flexible spacer
            would squeeze it down to its intrinsic width instead.
          */}
          <Row alignment="center" testID="nickname-row">
            <Text>{profileLabels.nickname}</Text>
            <TextInput
              autoComplete="nickname"
              maxLength={NICKNAME_MAX_LENGTH}
              onChangeText={edit.changeNickname}
              placeholder={profileLabels.nickname}
              testID="profile-nickname"
              textAlign="right"
              value={nicknameField}
            />
          </Row>

          <Row alignment="center" testID="username-row">
            <Text>{profileLabels.username}</Text>
            {/*
              Read-only rather than hidden while the lock is on: the person still
              needs to see the id they hold, and the note below says when it can
              change again.
            */}
            <TextInput
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect={false}
              editable={!edit.isUsernameLocked}
              maxLength={USERNAME_MAX_LENGTH}
              onChangeText={changeUsername}
              placeholder={profileLabels.username}
              readOnly={edit.isUsernameLocked}
              testID="profile-username"
              textAlign="right"
              value={usernameField}
            />
          </Row>

          <FieldGroup.SectionFooter>
            <Column spacing={8}>
              {/*
                Nothing is reserved for these. An empty message would leave a gap
                under the fields on the screen everybody opens, to make room for
                a state most people never reach.
              */}
              {edit.nicknameMessage ? (
                <Text testID="profile-nickname-message">
                  {edit.nicknameMessage}
                </Text>
              ) : null}

              {edit.usernameMessage ? (
                <Text testID="profile-username-message">
                  {edit.usernameMessage}
                </Text>
              ) : null}

              {edit.suggestions.map((candidate) => (
                <UsernameSuggestion
                  candidate={candidate}
                  key={candidate}
                  onChoose={chooseSuggestion}
                />
              ))}

              <Text testID="profile-username-policy">{edit.policyNote}</Text>

              {cameraDeniedMessage ? (
                <Text testID="profile-camera-denied">
                  {cameraDeniedMessage}
                </Text>
              ) : null}

              {edit.saveFailure ? (
                <Text testID="profile-save-failure">{edit.saveFailure}</Text>
              ) : null}
            </Column>
          </FieldGroup.SectionFooter>
        </FieldGroup.Section>
      </FieldGroup>

      {/*
        Draws nothing on iOS, where the OS action sheet is already on screen. The
        check lives inside the sheet so this tree stays one shape on both.
      */}
      <PhotoSourceSheet actions={menuActions} menu={menu} />
    </Host>
  );
}

/**
 * A free spelling of the id the person asked for, confirmed by the server before
 * it was offered. Its own component so pressing it is one stable function.
 */
function UsernameSuggestion({
  candidate,
  onChoose,
}: {
  candidate: string;
  onChoose: (value: string) => void;
}) {
  const choose = useCallback(() => {
    onChoose(candidate);
  }, [candidate, onChoose]);

  return (
    <Button onPress={choose} testID="profile-username-suggestion">
      {candidate}
    </Button>
  );
}
