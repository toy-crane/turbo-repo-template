import { router, Stack } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator } from "react-native";
import { useAppTheme } from "@/core/theme/app-theme-bridge";

import { profileLabels } from "@/features/auth/ui/profile-labels";
import {
  ProfileEditScreen,
  useProfileEditFlow,
} from "@/screens/settings/profile-edit-screen";

export default function ProfileEditRoute() {
  // A finished save is the one exit that keeps the draft. Going back any other
  // way drops it, which is what makes the back arrow a cancel.
  const returnToSettings = useCallback(() => {
    router.back();
  }, []);
  const flow = useProfileEditFlow(returnToSettings);
  const { danger } = useAppTheme();

  return (
    <>
      {/*
        Held back until the saved profile is in hand. The native text fields take
        their starting text when they mount, so a screen that appeared first
        would show two empty fields and never fill them. Settings has already
        read the profile, so in practice this is the same frame.
      */}
      {flow.edit.isReady ? (
        <ProfileEditScreen danger={danger} flow={flow} />
      ) : null}
      <Stack.Toolbar placement="right">
        {/*
          While the save runs, the control becomes the progress itself. Left as a
          greyed-out check it looks the same as a check that is simply not ready,
          and a save carrying a photo takes long enough for that to matter.

          There is no loading state on a toolbar button, so this swaps in a custom
          view — the escape hatch the toolbar documents for anything beyond
          buttons and menus.
        */}
        {flow.edit.isSaving ? (
          <Stack.Toolbar.View>
            <ActivityIndicator accessibilityLabel={profileLabels.saving} />
          </Stack.Toolbar.View>
        ) : (
          /*
            A check rather than the word 저장. The accessible name still says 저장,
            because a screen reader gets no help from the shape.

            Disabled until something has actually changed and every value is
            usable, so pressing it always saves rather than sometimes explaining
            why it cannot.
          */
          <Stack.Toolbar.Button
            accessibilityLabel={profileLabels.save}
            disabled={!flow.edit.canSave}
            icon="checkmark"
            onPress={flow.save}
          />
        )}
      </Stack.Toolbar>
    </>
  );
}
