import { FieldGroup, Host, Row, Spacer, Switch, Text } from "@expo/ui";
import Constants from "expo-constants";
import { useState } from "react";
import { Platform } from "react-native";

import { useAppTheme } from "../../theme/app-theme-provider";
import { getSettingsTextStyle } from "./settings-theme";

const appVersion = Constants.expoConfig?.version ?? "Unknown";

export function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const { colors } = useAppTheme();
  const textStyle = getSettingsTextStyle(colors);
  const androidTextStyle = Platform.OS === "android" ? textStyle : undefined;

  return (
    <Host style={{ flex: 1 }} useViewportSizeMeasurement>
      <FieldGroup testID="settings-field-group">
        <FieldGroup.Section title="Preferences">
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
