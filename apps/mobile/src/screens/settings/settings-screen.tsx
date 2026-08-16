import {
  FieldGroup,
  Host,
  Icon,
  RNHostView,
  Row,
  Spacer,
  Switch,
  Text,
} from "@expo/ui";
import Constants from "expo-constants";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useState } from "react";
import { Platform } from "react-native";

import {
  readProfileAvatarUrl,
  useProfile,
} from "@/features/auth/query/profile";
import { useAuthSession } from "@/features/auth/state/auth-session";
import { useSignOut } from "@/features/auth/state/use-sign-out";
import { profileLabels } from "@/features/auth/ui/profile-labels";
import { ActionProgress } from "@/shared/ui/action-progress";
import {
  destructiveActionModifiers,
  useDestructiveActionAnnouncement,
} from "./destructive-action";
import { SettingsActionRow } from "./settings-action-row";
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
  onOpenProfile,
}: {
  danger: string;
  muted: string;
  onOpenProfile: () => void;
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
  useDestructiveActionAnnouncement(profileLabels.signOut, isSigningOut);

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
                onPress={onOpenProfile}
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
            onPress={onOpenProfile}
            testID="profile-row"
            trailing={
              Platform.OS === "ios" ? (
                <Icon color={muted} name="chevron.right" size={CHEVRON_SIZE} />
              ) : undefined
            }
          >
            <Text>{profileLabels.profile}</Text>
          </SettingsActionRow>
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

        {/*
          Last, alone and unnamed. A title would have to say what this one row is
          a group of, and the platform already reads a lone trailing group as the
          thing that ends the screen. 계정 삭제 is not here: two red rows on one
          screen take weight from each other, so it sits in 프로필 instead.

          Red because signing out ends something. No chevron because it acts
          immediately rather than opening another screen.

          The name stays 로그아웃 the whole time; the indicator appears in the
          trailing slot and `accessibilityValue` is what says it is running.
          `useSignOut` already drops a second press.
        */}
        <FieldGroup.Section testID="sign-out-section">
          <SettingsActionRow
            modifiers={destructiveActionModifiers(isSigningOut)}
            onPress={requestSignOut}
            testID="sign-out-button"
            trailing={
              isSigningOut ? (
                <ActionProgress testID="sign-out-progress" />
              ) : undefined
            }
          >
            <Text textStyle={{ color: danger }}>{profileLabels.signOut}</Text>
          </SettingsActionRow>
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
