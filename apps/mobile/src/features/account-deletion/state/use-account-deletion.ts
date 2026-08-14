import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";

import { deleteAccount } from "@/features/account-deletion/api/delete-account";
import { accountDeletionLabels } from "@/features/account-deletion/ui/account-deletion-labels";
import { signOut } from "@/features/auth/api/sign-out";
import { getSupabaseClient } from "@/shared/supabase/client";

export interface AccountDeletionState {
  /** Opens the platform's confirmation; deletion only starts from inside it. */
  confirmDeletion: () => void;
  /** What to tell the person when the account outlived the attempt. */
  failure: string | undefined;
  isDeleting: boolean;
}

/**
 * Deleting the account, as a screen needs it.
 *
 * The confirmation belongs here rather than in the screen: it is the only way
 * into the deletion, so the row that starts it never has to know that the
 * platform dialog is what actually calls the server.
 */
export function useAccountDeletion(): AccountDeletionState {
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
    // Already running: the row is showing progress, and a second dialog would
    // only offer a request the guard above is going to drop anyway.
    if (running.current === "running") {
      return;
    }

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
