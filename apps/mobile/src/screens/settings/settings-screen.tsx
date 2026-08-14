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
  onOpenProfile,
}: {
  danger: string;
  foreground: string;
  muted: string;
  onOpenProfile: () => void;
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
              onPress={onOpenProfile}
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
            onPress={onOpenProfile}
            testID="profile-row"
            trailing={
              Platform.OS === "ios" ? (
                <Icon color={muted} name="chevron.right" size={CHEVRON_SIZE} />
              ) : undefined
            }
          >
            <Text textStyle={androidTextStyle}>{profileLabels.profile}</Text>
          </ListItem>
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

        {/*
          Last, alone and unnamed. A title would have to say what this one row is
          a group of, and the platform already reads a lone trailing group as the
          thing that ends the screen. 계정 탈퇴 is not here: two red rows on one
          screen take weight from each other, so it sits in 프로필 instead.

          Red because signing out ends something. No chevron because it acts
          immediately rather than opening another screen.
        */}
        <FieldGroup.Section testID="sign-out-section">
          <ListItem onPress={requestSignOut} testID="sign-out-button">
            <Text textStyle={{ color: danger }}>
              {isSigningOut ? profileLabels.signingOut : profileLabels.signOut}
            </Text>
          </ListItem>
          {signOutFailure ? (
            <FieldGroup.SectionFooter>
              <Text testID="sign-out-error" textStyle={{ color: danger }}>
                {signOutFailure}
              </Text>
            </FieldGroup.SectionFooter>
          ) : null}
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
