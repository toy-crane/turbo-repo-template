import { FieldGroup, Host, Row, Spacer, Switch, Text } from "@expo/ui";
import Constants from "expo-constants";
import { useState } from "react";
import { Platform, StyleSheet, useColorScheme } from "react-native";

import { getSettingsTextStyle } from "./settings-theme";

const appVersion = Constants.expoConfig?.version ?? "Unknown";

export function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const textStyle = getSettingsTextStyle(useColorScheme());
  const androidTextStyle = Platform.OS === "android" ? textStyle : undefined;

  return (
    <Host style={{ flex: 1 }} useViewportSizeMeasurement>
      <FieldGroup style={styles.fieldGroup} testID="settings-field-group">
        <FieldGroup.Section title="Preferences">
          <Row alignment="center">
            <Text textStyle={androidTextStyle}>Notifications</Text>
            <Spacer flexible />
            <Switch
              accessibilityLabel="Notifications"
              onValueChange={setNotificationsEnabled}
              testID="notifications-switch"
              value={notificationsEnabled}
            />
          </Row>
          <Row alignment="center">
            <Text textStyle={androidTextStyle}>Haptics</Text>
            <Spacer flexible />
            <Switch
              accessibilityLabel="Haptics"
              onValueChange={setHapticsEnabled}
              testID="haptics-switch"
              value={hapticsEnabled}
            />
          </Row>
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

const styles = StyleSheet.create({
  fieldGroup: {
    paddingBottom: 132,
  },
});
