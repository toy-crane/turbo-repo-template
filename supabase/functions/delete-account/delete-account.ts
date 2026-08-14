const AVATAR_BUCKET = "avatars";
const AVATAR_PAGE_SIZE = 100;

export interface AccountDeletionError {
  code?: string;
  message: string;
  status?: number;
}

interface StorageEntry {
  id: string | null;
  name: string;
}

interface AvatarFolder {
  list: (
    folder: string,
    options?: { limit?: number },
  ) => Promise<{
    data: StorageEntry[] | null;
    error: AccountDeletionError | null;
  }>;
  remove: (
    paths: string[],
  ) => Promise<{ error: AccountDeletionError | null }>;
}

export interface AccountDeletionAdmin {
  auth: {
    admin: {
      deleteUser: (
        userId: string,
      ) => Promise<{ error: AccountDeletionError | null }>;
    };
  };
  from: (table: "profiles") => {
    update: (values: { account_deletion_started_at: string }) => {
      eq: (
        column: "id",
        value: string,
      ) => Promise<{ error: AccountDeletionError | null }>;
    };
  };
  storage: {
    from: (bucket: string) => AvatarFolder;
  };
}

async function deleteAvatarFolder(
  avatars: AvatarFolder,
  folder: string,
): Promise<void> {
  let hasMoreEntries = true;

  while (hasMoreEntries) {
    const { data, error: listError } = await avatars.list(folder, {
      limit: AVATAR_PAGE_SIZE,
    });

    if (listError) {
      throw listError;
    }

    const entries = data ?? [];
    const nestedFolders = entries.filter(({ id }) => id === null);

    for (const entry of nestedFolders) {
      await deleteAvatarFolder(avatars, `${folder}/${entry.name}`);
    }

    const paths = entries
      .filter(({ id }) => id !== null)
      .map(({ name }) => `${folder}/${name}`);

    if (paths.length > 0) {
      const { error: removeError } = await avatars.remove(paths);

      if (removeError) {
        throw removeError;
      }
    }

    hasMoreEntries = entries.length === AVATAR_PAGE_SIZE;
  }
}

/** Permanently removes the data owned by one verified Supabase user. */
export async function deleteCurrentAccount(
  admin: AccountDeletionAdmin,
  userId: string,
  deletionStartedAt = new Date().toISOString(),
): Promise<void> {
  // This update is also a write fence. Storage RLS takes a row lock while an
  // avatar write checks this value, so once this returns every earlier write is
  // done and every later write is refused.
  const { error: markError } = await admin
    .from("profiles")
    .update({ account_deletion_started_at: deletionStartedAt })
    .eq("id", userId);

  if (markError) {
    throw markError;
  }

  const avatars = admin.storage.from(AVATAR_BUCKET);

  await deleteAvatarFolder(avatars, userId);

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

  if (
    deleteError &&
    deleteError.status !== 404 &&
    deleteError.code !== "user_not_found"
  ) {
    throw deleteError;
  }
}
