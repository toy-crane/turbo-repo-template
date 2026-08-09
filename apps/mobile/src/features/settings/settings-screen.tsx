import { Button, FieldGroup, Host, Row, Spacer, Switch, Text } from "@expo/ui";
import { listSectionMargins } from "@expo/ui/swift-ui/modifiers";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useCallback, useState } from "react";
import { Platform } from "react-native";

import { signOut } from "../../features/auth/sign-out";
import { getSupabaseClient } from "../../supabase/client";
import { useAppTheme } from "../../theme/app-theme-bridge";
import { getSettingsTextStyle } from "./settings-theme";

const appVersion = Constants.expoConfig?.version ?? "Unknown";
const contentTopSpacing = 24;

export function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutFailure, setSignOutFailure] = useState<string | undefined>();
  const queryClient = useQueryClient();
  const { foreground } = useAppTheme();

  const requestSignOut = useCallback(async () => {
    // A second press while the first is still running would clear the cache
    // twice and race the session change.
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setSignOutFailure(undefined);

    try {
      await signOut(getSupabaseClient(), queryClient);
    } catch (error) {
      // Reaching this means the local session survived, so this screen is still
      // on top and can offer the retry.
      setSignOutFailure(
        `로그아웃을 끝내지 못했습니다. 다시 시도해 주세요. (${error instanceof Error ? error.message : String(error)})`
      );
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, queryClient]);
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
        <FieldGroup.Section title="Account">
          <Button
            disabled={isSigningOut}
            label={isSigningOut ? "로그아웃 중" : "로그아웃"}
            onPress={requestSignOut}
            testID="sign-out-button"
            variant="text"
          />
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
