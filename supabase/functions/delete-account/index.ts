import { withSupabase } from "@supabase/server";

import {
  type AccountDeletionAdmin,
  deleteCurrentAccount,
} from "./delete-account.ts";

function readFailureDetails(error: unknown): {
  code?: unknown;
  status?: unknown;
} {
  if (!error || typeof error !== "object") {
    return {};
  }

  return {
    code: "code" in error ? error.code : undefined,
    status: "status" in error ? error.status : undefined,
  };
}

interface DeleteAccountContext {
  deleteVerifiedAccount: (userId: string) => Promise<void>;
  userClaims?: { id: string } | null;
}

export async function handleDeleteAccount(
  request: Request,
  { deleteVerifiedAccount, userClaims }: DeleteAccountContext,
): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: "METHOD_NOT_ALLOWED" },
      { headers: { Allow: "POST" }, status: 405 },
    );
  }

  if (!userClaims) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    await deleteVerifiedAccount(userClaims.id);

    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Account deletion failed.", readFailureDetails(error));

    return Response.json(
      { error: "ACCOUNT_DELETION_FAILED" },
      { status: 500 },
    );
  }
}

const deleteAccount = withSupabase(
  { auth: "user" },
  (request, context) =>
    handleDeleteAccount(request, {
      deleteVerifiedAccount: (userId) =>
        deleteCurrentAccount(
          context.supabaseAdmin as unknown as AccountDeletionAdmin,
          userId,
        ),
      userClaims: context.userClaims,
    }),
);

export default { fetch: deleteAccount };
