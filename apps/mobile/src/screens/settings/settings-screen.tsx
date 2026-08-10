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
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";

import { useAppTheme } from "@/core/theme/app-theme-bridge";
import { signOut } from "@/features/auth/sign-out";
import { getSupabaseClient } from "@/shared/supabase/client";

const appVersion = Constants.expoConfig?.version ?? "Unknown";
const contentTopSpacing = 24;

export function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutFailure, setSignOutFailure] = useState<string | undefined>();
  const queryClient = useQueryClient();
  const signingOut = useRef<"idle" | "running">("idle");
  const { foreground } = useAppTheme();

  const requestSignOut = useCallback(async () => {
    // The ref, not the state, is what blocks the second press: two taps in the
    // same frame both read the state from before the first one.
    if (signingOut.current === "running") {
      return;
    }

    signingOut.current = "running";
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
      signingOut.current = "idle";
      setIsSigningOut(false);
    }
  }, [queryClient]);
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
