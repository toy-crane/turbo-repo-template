import {
  Column,
  FieldGroup,
  Host,
  ListItem,
  RNHostView,
  Row,
  Text,
  TextInput,
  useNativeState,
} from "@expo/ui";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useCallback } from "react";
import { Alert, Platform } from "react-native";

import { useAccountDeletion } from "@/features/account-deletion/state/use-account-deletion";
import { accountDeletionLabels } from "@/features/account-deletion/ui/account-deletion-labels";
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
import { ActionProgress } from "@/shared/ui/action-progress";
import {
  destructiveActionModifiers,
  useDestructiveActionAnnouncement,
} from "./destructive-action";
import {
  type PhotoSourceActions,
  PhotoSourceSheet,
  usePhotoSourceMenu,
} from "./photo-source-menu";
import { ProfileEditHero } from "./profile-edit-hero";
import { SettingsActionRow } from "./settings-action-row";

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
export function ProfileEditScreen({
  danger,
  flow,
}: {
  danger: string;
  flow: ProfileEditFlow;
}) {
  const { cameraDeniedMessage, edit, menu, menuActions } = flow;
  // Android draws the form under its own app bar, so the screen has to leave
  // room for it. iOS insets a form for the navigation bar already.
  const headerHeight = useHeaderHeight();
  // Not part of the draft: deleting the account ends the thing being edited, so
  // it neither waits for 저장 nor blocks it.
  const deletion = useAccountDeletion();
  useDestructiveActionAnnouncement(
    accountDeletionLabels.deleteAccount,
    deletion.isDeleting
  );
  /*
   * Red is what separates a problem from the standing explanation under it.
   * Both sit in the same footer, and left the same grey they read as one block
   * of small print. The check in progress is not a problem, so it stays quiet.
   */
  const problemStyle = { color: danger };
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
      <FieldGroup
        style={
          Platform.OS === "android" ? { paddingTop: headerHeight } : undefined
        }
        testID="profile-edit-field-group"
      >
        {/*
          A section header, not a section child, the same way Settings carries
          its own hero. A plain child is a row of the form: iOS gives it the
          inset background and separators, and Android wraps it in a Material
          row that draws a card behind the picture.
        */}
        <FieldGroup.Section>
          <FieldGroup.SectionHeader>
            <RNHostView matchContents>
              <ProfileEditHero
                avatarUrl={edit.avatarUrl}
                displayName={edit.nickname}
                onEditPhoto={menu.open}
              />
            </RNHostView>
          </FieldGroup.SectionHeader>
        </FieldGroup.Section>

        {/*
          No section title. The two fields under a person's own picture are
          plainly their profile, and naming them again only pushed the form
          further down the screen.
        */}
        <FieldGroup.Section>
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
              // An account id is lowercase latin, digits and underscore. A
              // composing keyboard turns those keys into Hangul the field then
              // has to reject, so ask for the plain ASCII one.
              keyboardType="ascii-capable"
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
                <Text
                  testID="profile-nickname-message"
                  textStyle={problemStyle}
                >
                  {edit.nicknameMessage}
                </Text>
              ) : null}

              {edit.usernameMessage ? (
                <Text
                  testID="profile-username-message"
                  textStyle={edit.isCheckingUsername ? undefined : problemStyle}
                >
                  {edit.usernameMessage}
                </Text>
              ) : null}

              <Text testID="profile-username-policy">{edit.policyNote}</Text>

              {cameraDeniedMessage ? (
                <Text testID="profile-camera-denied">
                  {cameraDeniedMessage}
                </Text>
              ) : null}

              {edit.saveFailure ? (
                <Text testID="profile-save-failure" textStyle={problemStyle}>
                  {edit.saveFailure}
                </Text>
              ) : null}
            </Column>
          </FieldGroup.SectionFooter>
        </FieldGroup.Section>

        {/*
          The alternatives are their own section of rows rather than controls
          inside the footer above. A section footer is a place for explanation,
          and mounting a button in one crashed the app outright the moment an id
          came back reserved or taken. Rows are also the shape a person already
          taps everywhere else in Settings.
        */}
        {edit.suggestions.length > 0 ? (
          <FieldGroup.Section title={profileLabels.suggestions}>
            {edit.suggestions.map((candidate) => (
              <UsernameSuggestion
                candidate={candidate}
                key={candidate}
                onChoose={chooseSuggestion}
              />
            ))}
          </FieldGroup.Section>
        ) : null}

        {/*
          Last, alone and unnamed, the same shape Settings gives 로그아웃. A title
          would have to say what this one group is a group of.

          `SettingsActionRow`, which on iOS is a `ListItem` — a SwiftUI `Button`
          that takes the press anywhere across the row — and on Android a plain
          `Row`, because the section there already wraps each child in a Material
          row. The universal `Button` only answers on the
          text it draws, and neither `contentShape` on the button nor on its
          content extends that, so the right of the row would look pressable and
          do nothing. No icon and no chevron: it does not go anywhere. It raises
          the platform's confirmation where it stands, which is also why the
          footer has to say what disappears — it is read before the press, not
          after it.

          The name stays 계정 삭제 the whole time; the indicator appears in the
          trailing slot and `accessibilityValue` is what says it is running.
          Nothing is disabled: SwiftUI dims a disabled row, which would drain the
          red out of the one word that marks this as destructive. Pressing again
          while it runs opens nothing anyway — `useAccountDeletion` drops the
          request before the dialog.
        */}
        <FieldGroup.Section testID="account-deletion-section">
          <SettingsActionRow
            modifiers={destructiveActionModifiers(deletion.isDeleting)}
            onPress={deletion.confirmDeletion}
            testID="delete-account-row"
            trailing={
              deletion.isDeleting ? (
                <ActionProgress testID="delete-account-progress" />
              ) : undefined
            }
          >
            <Text textStyle={problemStyle}>
              {accountDeletionLabels.deleteAccount}
            </Text>
          </SettingsActionRow>
          <FieldGroup.SectionFooter>
            {/*
              The failure takes the notice's place rather than stacking under it.
              Both say what happens to the account, and side by side the one that
              needs acting on reads as more small print.
            */}
            {deletion.failure ? (
              <Text testID="account-deletion-error" textStyle={problemStyle}>
                {deletion.failure}
              </Text>
            ) : (
              <Text testID="account-deletion-notice">
                {accountDeletionLabels.deletionNotice}
              </Text>
            )}
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
    <ListItem onPress={choose} testID="profile-username-suggestion">
      <Text>{candidate}</Text>
    </ListItem>
  );
}
