import {
  FieldGroup,
  Host,
  Icon,
  ListItem,
  RNHostView,
  Row,
  Spacer,
  Switch,
  Text,
} from "@expo/ui";
import Constants from "expo-constants";
import { useState } from "react";
import { Platform } from "react-native";

import { accountDeletionLabels } from "@/features/account-deletion/ui/account-deletion-labels";
import {
  readProfileAvatarUrl,
  useProfile,
} from "@/features/auth/query/profile";
import { useAuthSession } from "@/features/auth/state/auth-session";
import { useSignOut } from "@/features/auth/state/use-sign-out";
import { profileLabels } from "@/features/auth/ui/profile-labels";
import { heroRowModifiers } from "./hero-row";
import { SettingsProfileHero } from "./settings-profile-hero";

const appVersion = Constants.expoConfig?.version ?? "Unknown";
/** What iOS uses for a list disclosure chevron, which is smaller than body text. */
const CHEVRON_SIZE = 14;

/**
 * The app's settings.
 *
 * The foreground colour arrives as a prop: the app theme belongs to the root
 * layout, and a screen does not reach up into it.
 */
export function SettingsScreen({
  danger,
  foreground,
  muted,
  onDeleteAccount,
  onEditProfile,
}: {
  danger: string;
  foreground: string;
  muted: string;
  onDeleteAccount: () => void;
  onEditProfile: () => void;
}) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const { session } = useAuthSession();
  const { data: profile } = useProfile(session?.user.id);
  const {
    failure: signOutFailure,
    isSigningOut,
    requestSignOut,
  } = useSignOut();
  // Android's @expo/ui text does not follow the app's appearance on its own, so
  // the screen passes the same foreground colour the rest of the app uses.
  const androidTextStyle =
    Platform.OS === "android" ? { color: foreground } : undefined;

  return (
    <Host style={{ flex: 1 }} useViewportSizeMeasurement>
      <FieldGroup testID="settings-field-group">
        {/*
          The header is React Native inside the form rather than a second Host
          above it: the form owns the whole body, and a separate host would leave
          the header pinned while the sections scrolled under it. A non-section
          child renders inline between sections, which is where it belongs.
        */}
        <FieldGroup.Section modifiers={heroRowModifiers}>
          <RNHostView matchContents>
            <SettingsProfileHero
              avatarUrl={readProfileAvatarUrl(profile)}
              displayName={profile?.displayName ?? null}
              onPress={onEditProfile}
              username={profile?.username ?? null}
            />
          </RNHostView>
        </FieldGroup.Section>

        <FieldGroup.Section title={profileLabels.account}>
          {/*
            ListItem rather than Button: a button's press area follows its label,
            so a tap on the empty right half of the row did nothing. A list row
            takes the press anywhere across it, which is what the rest of this
            screen already behaves like.
          */}
          {/*
            The chevron is iOS telling people the row goes somewhere. `@expo/ui`
            has no disclosure indicator of its own — SwiftUI only draws the small
            grey one for a NavigationLink — so the size and colour are set here.
            Left at its intrinsic size it inherits the row's font and reads as a
            heavy black arrow rather than the system's quiet one.

            Android lists do not use a chevron, so it is left off there rather
            than drawn from a second icon set.
          */}
          <ListItem
            onPress={onEditProfile}
            testID="edit-profile-row"
            trailing={
              Platform.OS === "ios" ? (
                <Icon color={muted} name="chevron.right" size={CHEVRON_SIZE} />
              ) : undefined
            }
          >
            <Text textStyle={androidTextStyle}>
              {profileLabels.editProfile}
            </Text>
          </ListItem>
          {/*
            Red because signing out ends something. It has no chevron because it
            acts immediately rather than opening another screen.
          */}
          <ListItem onPress={requestSignOut} testID="sign-out-button">
            <Text textStyle={{ color: danger }}>
              {isSigningOut ? profileLabels.signingOut : profileLabels.signOut}
            </Text>
          </ListItem>
          <ListItem
            onPress={onDeleteAccount}
            testID="delete-account-row"
            trailing={
              Platform.OS === "ios" ? (
                <Icon color={muted} name="chevron.right" size={CHEVRON_SIZE} />
              ) : undefined
            }
          >
            <Text textStyle={{ color: danger }}>
              {accountDeletionLabels.deleteAccount}
            </Text>
          </ListItem>
          {signOutFailure ? (
            <Row testID="sign-out-error">
              <Text textStyle={androidTextStyle}>{signOutFailure}</Text>
            </Row>
          ) : null}
        </FieldGroup.Section>

        <FieldGroup.Section
          testID="preferences-section"
          title={profileLabels.preferences}
        >
          <Switch
            label={profileLabels.notifications}
            onValueChange={setNotificationsEnabled}
            testID="notifications-switch"
            value={notificationsEnabled}
          />
          <Switch
            label={profileLabels.haptics}
            onValueChange={setHapticsEnabled}
            testID="haptics-switch"
            value={hapticsEnabled}
          />
        </FieldGroup.Section>

        <FieldGroup.Section title={profileLabels.appInfo}>
          <Row alignment="center" testID="version-row">
            <Text textStyle={androidTextStyle}>{profileLabels.version}</Text>
            <Spacer flexible />
            <Text textStyle={androidTextStyle}>{appVersion}</Text>
          </Row>
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
