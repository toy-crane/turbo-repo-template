import { FieldGroup, Host, Row, Spacer, Switch, Text } from "@expo/ui";
import Constants from "expo-constants";
import { useState } from "react";

const appVersion = Constants.expoConfig?.version ?? "Unknown";

export function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  return (
    <Host style={{ flex: 1 }} useViewportSizeMeasurement>
      <FieldGroup>
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
            <Text>Version</Text>
            <Spacer flexible />
            <Text>{appVersion}</Text>
          </Row>
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
