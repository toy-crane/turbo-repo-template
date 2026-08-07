import { FieldGroup, Host, Row, Spacer, Switch, Text } from "@expo/ui";
import Constants from "expo-constants";
import { useState } from "react";
import { Platform, useColorScheme } from "react-native";

import { getSettingsTextStyle } from "./settings-theme";

const appVersion = Constants.expoConfig?.version ?? "Unknown";

interface PreferenceSwitchProps {
  label: string;
  onValueChange: (value: boolean) => void;
  testID: string;
  textStyle: ReturnType<typeof getSettingsTextStyle>;
  value: boolean;
}

function PreferenceSwitch({
  label,
  onValueChange,
  testID,
  textStyle,
  value,
}: PreferenceSwitchProps) {
  if (Platform.OS !== "android") {
    return (
      <Switch
        label={label}
        onValueChange={onValueChange}
        testID={testID}
        value={value}
      />
    );
  }

  return (
    <Row alignment="center">
      <Text textStyle={textStyle}>{label}</Text>
      <Spacer flexible />
      <Switch onValueChange={onValueChange} testID={testID} value={value} />
    </Row>
  );
}

export function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const textStyle = getSettingsTextStyle(useColorScheme());
  const androidTextStyle = Platform.OS === "android" ? textStyle : undefined;

  return (
    <Host style={{ flex: 1 }} useViewportSizeMeasurement>
      <FieldGroup>
        <FieldGroup.Section title="Preferences">
          <PreferenceSwitch
            label="Notifications"
            onValueChange={setNotificationsEnabled}
            testID="notifications-switch"
            textStyle={textStyle}
            value={notificationsEnabled}
          />
          <PreferenceSwitch
            label="Haptics"
            onValueChange={setHapticsEnabled}
            testID="haptics-switch"
            textStyle={textStyle}
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
