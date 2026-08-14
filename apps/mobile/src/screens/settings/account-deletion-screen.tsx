import { Button, FieldGroup, Host, Row, Text } from "@expo/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { Alert, Platform } from "react-native";

import { deleteAccount } from "@/features/account-deletion/api/delete-account";
import { accountDeletionLabels } from "@/features/account-deletion/ui/account-deletion-labels";
import { signOut } from "@/features/auth/api/sign-out";
import { getSupabaseClient } from "@/shared/supabase/client";

function useAccountDeletionFlow() {
  const [failure, setFailure] = useState<string | undefined>();
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const running = useRef<"idle" | "running">("idle");

  const deleteCurrentAccount = useCallback(async () => {
    // State updates land after the current event. The ref blocks two presses in
    // that gap from sending the same destructive request twice.
    if (running.current === "running") {
      return;
    }

    running.current = "running";
    setIsDeleting(true);
    setFailure(undefined);

    const client = getSupabaseClient();

    try {
      await deleteAccount(client);

      try {
        // The server has already removed the account. Supabase treats a missing
        // user as a successful local sign-out, and this also clears Google's
        // local account choice when Google was the sign-in method.
        await signOut(client);
      } catch {
        // auth-js removes the local session before returning a non-ignored
        // sign-out error. The deleted account cannot be restored here, so the
        // app still has to finish removing this user's local data.
      }

      queryClient.clear();
    } catch {
      // A lost response can mean the server finished after all. Keeping the
      // current session lets the person retry; the Edge Function is idempotent.
      setFailure(accountDeletionLabels.deletionFailed);
    } finally {
      running.current = "idle";
      setIsDeleting(false);
    }
  }, [queryClient]);

  const confirmDeletion = useCallback(() => {
    Alert.alert(
      accountDeletionLabels.confirmTitle,
      accountDeletionLabels.confirmBody,
      [
        { style: "cancel", text: accountDeletionLabels.cancel },
        {
          onPress: deleteCurrentAccount,
          style: "destructive",
          text: accountDeletionLabels.deleteAccount,
        },
      ]
    );
  }, [deleteCurrentAccount]);

  return { confirmDeletion, failure, isDeleting };
}

/** Explains permanent deletion before the platform's final destructive alert. */
export function AccountDeletionScreen({
  danger,
  foreground,
}: {
  danger: string;
  foreground: string;
}) {
  const { confirmDeletion, failure, isDeleting } = useAccountDeletionFlow();
  const androidTextStyle =
    Platform.OS === "android" ? { color: foreground } : undefined;

  return (
    <Host style={{ flex: 1 }} useViewportSizeMeasurement>
      <FieldGroup testID="account-deletion-field-group">
        <FieldGroup.Section title={accountDeletionLabels.deletionTargets}>
          <Row>
            <Text textStyle={androidTextStyle}>
              {accountDeletionLabels.account}
            </Text>
          </Row>
          <Row>
            <Text textStyle={androidTextStyle}>
              {accountDeletionLabels.profile}
            </Text>
          </Row>
          <Row>
            <Text textStyle={androidTextStyle}>
              {accountDeletionLabels.uploadedAvatar}
            </Text>
          </Row>
          <FieldGroup.SectionFooter>
            <Text textStyle={androidTextStyle}>
              {accountDeletionLabels.deletionNotice}
            </Text>
          </FieldGroup.SectionFooter>
        </FieldGroup.Section>

        <FieldGroup.Section>
          <Button
            disabled={isDeleting}
            label={
              isDeleting
                ? accountDeletionLabels.deletingAccount
                : accountDeletionLabels.deleteAccount
            }
            onPress={confirmDeletion}
            testID="delete-account-button"
          />
          {failure ? (
            <FieldGroup.SectionFooter>
              <Text
                testID="account-deletion-error"
                textStyle={{ color: danger }}
              >
                {failure}
              </Text>
            </FieldGroup.SectionFooter>
          ) : null}
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
