import {
  FieldGroup,
  Host,
  ListItem,
  Row,
  Spacer,
  Switch,
  Text,
} from "@expo/ui";
import { listSectionMargins } from "@expo/ui/swift-ui/modifiers";
import Constants from "expo-constants";
import { useState } from "react";
import { Platform } from "react-native";

import { useSignOut } from "@/features/auth/state/use-sign-out";

const appVersion = Constants.expoConfig?.version ?? "Unknown";
const contentTopSpacing = 24;

/**
 * The app's settings.
 *
 * The foreground colour arrives as a prop: the app theme belongs to the root
 * layout, and a screen does not reach up into it.
 */
export function SettingsScreen({ foreground }: { foreground: string }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const {
    failure: signOutFailure,
    isSigningOut,
    requestSignOut,
  } = useSignOut();
  // Android's @expo/ui text does not follow the app's appearance on its own, so
  // the screen passes the same foreground colour the rest of the app uses.
  const androidTextStyle =
    Platform.OS === "android" ? { color: foreground } : undefined;
  const preferencesSectionModifiers =
    Platform.OS === "ios"
      ? [listSectionMargins({ edges: "top", length: contentTopSpacing })]
      : undefined;
  const preferencesSectionStyle =
    Platform.OS === "android" ? { paddingTop: contentTopSpacing } : undefined;

  return (
    <Host style={{ flex: 1 }} useViewportSizeMeasurement>
      <FieldGroup testID="settings-field-group">
        <FieldGroup.Section
          modifiers={preferencesSectionModifiers}
          style={preferencesSectionStyle}
          testID="preferences-section"
          title="Preferences"
        >
          <Switch
            label="Notifications"
            onValueChange={setNotificationsEnabled}
            testID="notifications-switch"
            value={notificationsEnabled}
          />
          <Switch
            label="Haptics"
            onValueChange={setHapticsEnabled}
            testID="haptics-switch"
            value={hapticsEnabled}
          />
        </FieldGroup.Section>
        <FieldGroup.Section title="Account">
          {/*
            ListItem rather than Button: a button's press area follows its label,
            so a tap on the empty right half of the row did nothing. A list row
            takes the press anywhere across it, which is what the rest of this
            screen already behaves like.
          */}
          <ListItem onPress={requestSignOut} testID="sign-out-button">
            <Text textStyle={androidTextStyle}>
              {isSigningOut ? "로그아웃 중" : "로그아웃"}
            </Text>
          </ListItem>
          {signOutFailure ? (
            <Row testID="sign-out-error">
              <Text textStyle={androidTextStyle}>{signOutFailure}</Text>
            </Row>
          ) : null}
        </FieldGroup.Section>
        <FieldGroup.Section title="About">
          <Row alignment="center" testID="version-row">
            <Text textStyle={androidTextStyle}>Version</Text>
            <Spacer flexible />
            <Text textStyle={androidTextStyle}>{appVersion}</Text>
          </Row>
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
