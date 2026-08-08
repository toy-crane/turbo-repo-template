import { FieldGroup, Host, Row, Spacer, Switch, Text } from "@expo/ui";
import { listSectionMargins } from "@expo/ui/swift-ui/modifiers";
import Constants from "expo-constants";
import { useState } from "react";
import { Platform } from "react-native";

import { useAppTheme } from "../../theme/app-theme-bridge";
import { getSettingsTextStyle } from "./settings-theme";

const appVersion = Constants.expoConfig?.version ?? "Unknown";
const contentTopSpacing = 24;

export function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const { foreground } = useAppTheme();
  const textStyle = getSettingsTextStyle(foreground);
  const androidTextStyle = Platform.OS === "android" ? textStyle : undefined;
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
