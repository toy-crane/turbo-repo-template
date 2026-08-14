const AVATAR_BUCKET = "avatars";
const AVATAR_PAGE_SIZE = 100;

export interface AccountDeletionError {
  code?: string;
  message: string;
  status?: number;
}

interface StorageEntry {
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
  storage: {
    from: (bucket: string) => AvatarFolder;
  };
}

/** Permanently removes the data owned by one verified Supabase user. */
export async function deleteCurrentAccount(
  admin: AccountDeletionAdmin,
  userId: string,
): Promise<void> {
  const avatars = admin.storage.from(AVATAR_BUCKET);
  let hasMoreAvatars = true;

  while (hasMoreAvatars) {
    const { data, error: listError } = await avatars.list(userId, {
      limit: AVATAR_PAGE_SIZE,
    });

    if (listError) {
      throw listError;
    }

    const entries = data ?? [];
    const paths = entries.map(({ name }) => `${userId}/${name}`);

    if (paths.length === 0) {
      break;
    }

    const { error: removeError } = await avatars.remove(paths);

    if (removeError) {
      throw removeError;
    }

    hasMoreAvatars = entries.length === AVATAR_PAGE_SIZE;
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

  if (
    deleteError &&
    deleteError.status !== 404 &&
    deleteError.code !== "user_not_found"
  ) {
    throw deleteError;
  }
}
