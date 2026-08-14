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
import { useHeaderHeight } from "expo-router/react-navigation";
import { type ReactNode, useState } from "react";
import { Platform } from "react-native";

import { accountDeletionLabels } from "@/features/account-deletion/ui/account-deletion-labels";
import {
  readProfileAvatarUrl,
  useProfile,
} from "@/features/auth/query/profile";
import { useAuthSession } from "@/features/auth/state/auth-session";
import { useSignOut } from "@/features/auth/state/use-sign-out";
import { profileLabels } from "@/features/auth/ui/profile-labels";
import { SettingsProfileHero } from "./settings-profile-hero";

const appVersion = Constants.expoConfig?.version ?? "Unknown";
/** What iOS uses for a list disclosure chevron, which is smaller than body text. */
const CHEVRON_SIZE = 14;

/**
 * The app's settings.
 *
 * Semantic colours that do not come from the native row arrive as props: the
 * app theme belongs to the root layout, and a screen does not reach up into it.
 */
export function SettingsScreen({
  danger,
  muted,
  onDeleteAccount,
  onEditProfile,
}: {
  danger: string;
  muted: string;
  onDeleteAccount: () => void;
  onEditProfile: () => void;
}) {
  const headerHeight = useHeaderHeight();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const { session } = useAuthSession();
  const { data: profile } = useProfile(session?.user.id);
  const {
    failure: signOutFailure,
    isSigningOut,
    requestSignOut,
  } = useSignOut();

  return (
    <Host style={{ flex: 1 }} useViewportSizeMeasurement>
      <FieldGroup
        style={
          Platform.OS === "android" ? { paddingTop: headerHeight } : undefined
        }
        testID="settings-field-group"
      >
        <FieldGroup.Section>
          <FieldGroup.SectionHeader>
            <RNHostView matchContents>
              <SettingsProfileHero
                avatarUrl={readProfileAvatarUrl(profile)}
                displayName={profile?.displayName ?? null}
                onPress={onEditProfile}
                username={profile?.username ?? null}
              />
            </RNHostView>
          </FieldGroup.SectionHeader>
        </FieldGroup.Section>

        <FieldGroup.Section title={profileLabels.account}>
          {/*
            The platform-specific row below takes the press anywhere across its
            width. A control whose press area follows only its label would leave
            the empty right half of the row inert.
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
          <SettingsActionRow
            onPress={onEditProfile}
            testID="edit-profile-row"
            trailing={
              Platform.OS === "ios" ? (
                <Icon color={muted} name="chevron.right" size={CHEVRON_SIZE} />
              ) : undefined
            }
          >
            <Text>{profileLabels.editProfile}</Text>
          </SettingsActionRow>
          {/*
            Red because signing out ends something. It has no chevron because it
            acts immediately rather than opening another screen.
          */}
          <SettingsActionRow onPress={requestSignOut} testID="sign-out-button">
            <Text textStyle={{ color: danger }}>
              {isSigningOut ? profileLabels.signingOut : profileLabels.signOut}
            </Text>
          </SettingsActionRow>
          <SettingsActionRow
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
          </SettingsActionRow>
          {signOutFailure ? (
            <Row testID="sign-out-error">
              <Text>{signOutFailure}</Text>
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
            <Text>{profileLabels.version}</Text>
            <Spacer flexible />
            <Text textStyle={{ color: muted }}>{appVersion}</Text>
          </Row>
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}

/**
 * A single settings row on both platforms.
 *
 * Android's `FieldGroup.Section` already wraps each child in a Material 3
 * `ListItem`, so nesting another `ListItem` creates the extra card seen behind
 * the content. iOS sections do not add that interactive wrapper, so they keep
 * `ListItem` and its full-width button hit area.
 */
function SettingsActionRow({
  children,
  onPress,
  testID,
  trailing,
}: {
  children: ReactNode;
  onPress: () => void;
  testID: string;
  trailing?: ReactNode;
}) {
  if (Platform.OS === "ios") {
    return (
      <ListItem onPress={onPress} testID={testID} trailing={trailing}>
        {children}
      </ListItem>
    );
  }

  return (
    <Row alignment="center" onPress={onPress} testID={testID}>
      {children}
      <Spacer flexible />
      {trailing}
    </Row>
  );
}
