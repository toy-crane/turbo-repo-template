import { jest } from "@jest/globals";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

/**
 * A stand-in for the Supabase client, controllable from a test.
 *
 * Tests drive sign-in through the same screens a person uses, so what they need
 * to fake is only the boundary: what the server answered, and when. Every auth
 * method is a jest.fn() with a working default, so a test overrides just the one
 * call it cares about and leaves the rest alone.
 */

export type AuthListener = (
  event: AuthChangeEvent,
  session: Session | null
) => void;

export interface RecordedUpdate {
  filters: { column: string; operator: "eq" | "is"; value: unknown }[];
  table: string;
  values: Record<string, unknown>;
}

/** The one profile row a select can read back, as the database stores it. */
export interface FakeProfileRow {
  avatar_path: string | null;
  avatar_url: string | null;
  display_name: string | null;
  username: string | null;
  username_locked_until: string | null;
}

/** One stored object, which is all the avatar bucket ever holds per person. */
export interface FakeStorageObject {
  bucket: string;
  contentType: string;
  path: string;
}

export interface FakeSupabaseOptions {
  /** Makes the profile read hang until settleProfile() runs. */
  holdProfile?: boolean;
  /** Makes getSession hang until settleSession() runs, for the checking state. */
  holdSession?: boolean;
  profile?: FakeProfileRow;
  profileError?: Error;
  session?: Session | null;
  sessionError?: Error;
  /** Account ids some other person already holds. */
  takenUsernames?: string[];
  /** Makes the availability check fail rather than answer. */
  usernameStatusError?: Error;
}

/**
 * The default is a finished profile, because most tests are about something
 * else and an unfinished one would send every signed-in test to onboarding. A
 * test about onboarding says so by passing an empty profile.
 */
const FINISHED_PROFILE: FakeProfileRow = {
  avatar_path: null,
  avatar_url: null,
  display_name: "이미 정한 이름",
  username: "alreadychosen",
  username_locked_until: null,
};

/** Where the local stack serves a public object from. */
const STORAGE_PUBLIC_BASE = "http://127.0.0.1:54321/storage/v1/object/public";

/** The template's own list, mirrored so the fake refuses what the database would. */
const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "official",
  "support",
  "system",
]);

export function createFakeUser(id = "user-1"): User {
  return {
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    email: "toy.crane@example.com",
    id,
    user_metadata: {},
  } as User;
}

export function createFakeSession(userId = "user-1"): Session {
  return {
    access_token: "access-token",
    expires_in: 3600,
    refresh_token: "refresh-token",
    token_type: "bearer",
    user: createFakeUser(userId),
  } as Session;
}

/**
 * A profile row with everything empty, plus whatever the test cares about.
 *
 * Tests name only the columns their subject reads, so a new column added to the
 * table does not send every fixture in the suite back for an edit it has no
 * opinion about.
 */
export function createProfileRow(
  overrides: Partial<FakeProfileRow> = {}
): FakeProfileRow {
  return {
    avatar_path: null,
    avatar_url: null,
    display_name: null,
    username: null,
    username_locked_until: null,
    ...overrides,
  };
}

/** A profile with neither value chosen, which is what opens onboarding. */
export function createEmptyProfile(): FakeProfileRow {
  return createProfileRow();
}

export function createFakeSupabase(options: FakeSupabaseOptions = {}) {
  let session = options.session ?? null;
  let settleSession = () => {
    // Replaced below when the test asked to hold the first read.
  };
  let settleProfile = () => {
    // Replaced below when the test asked to hold the profile read.
  };
  const gate = options.holdSession
    ? new Promise<void>((resolve) => {
        settleSession = resolve;
      })
    : Promise.resolve();
  const profileGate = options.holdProfile
    ? new Promise<void>((resolve) => {
        settleProfile = resolve;
      })
    : Promise.resolve();
  const listeners = new Set<AuthListener>();
  const updates: RecordedUpdate[] = [];
  const taken = new Set(options.takenUsernames ?? []);

  let { profileError } = options;
  let nextSaveError: Error | undefined;
  /** Set while a test wants the next save to stay in flight. */
  let saveGate: Promise<void> | undefined;

  const emit = (next: Session | null) => {
    session = next;

    for (const listener of listeners) {
      listener(next ? "SIGNED_IN" : "SIGNED_OUT", next);
    }
  };

  const auth = {
    getSession: jest.fn(async () => {
      await gate;

      return options.sessionError
        ? { data: { session: null }, error: options.sessionError }
        : { data: { session }, error: null };
    }),
    onAuthStateChange: jest.fn((listener: AuthListener) => {
      listeners.add(listener);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              listeners.delete(listener);
            },
          },
        },
      };
    }),
    signInWithIdToken: jest.fn((_credentials: unknown) => {
      const next = createFakeSession();

      emit(next);

      return Promise.resolve({
        data: { session: next, user: next.user },
        error: null,
      });
    }),
    signInWithOtp: jest.fn((_credentials: unknown) =>
      Promise.resolve({ data: { session: null, user: null }, error: null })
    ),
    signOut: jest.fn((_options?: unknown) => {
      emit(null);

      return Promise.resolve({ error: null });
    }),
    // The gate calls these; nothing to simulate.
    startAutoRefresh: jest.fn(() => Promise.resolve()),
    stopAutoRefresh: jest.fn(() => Promise.resolve()),
    verifyOtp: jest.fn((_params: unknown) => {
      const next = createFakeSession();

      emit(next);

      return Promise.resolve({
        data: { session: next, user: next.user },
        error: null,
      });
    }),
  };

  const profileRow: FakeProfileRow = options.profile ?? { ...FINISHED_PROFILE };

  const readProfileRow = async () => {
    await profileGate;

    return profileError
      ? { data: null, error: profileError }
      : { data: { ...profileRow }, error: null };
  };

  const saveProfileRow = async (values: Record<string, unknown>) => {
    if (saveGate) {
      const pending = saveGate;

      saveGate = undefined;
      await pending;
    }

    if (nextSaveError) {
      const error = nextSaveError;

      nextSaveError = undefined;

      return Promise.resolve({ data: null, error });
    }

    Object.assign(profileRow, values);

    return Promise.resolve({ data: { ...profileRow }, error: null });
  };

  const from = jest.fn((table: string) => ({
    // Only the shape the app reads today: one row, chosen by id. The filters go
    // unrecorded because the policy, not the query, is what scopes the read.
    select: (_columns: string) => {
      const builder = {
        eq: () => builder,
        single: () => readProfileRow(),
      };

      return builder;
    },
    update: (values: Record<string, unknown>) => {
      const record: RecordedUpdate = { filters: [], table, values };

      updates.push(record);

      // Thenable so `await` on the end of the chain resolves, and every filter
      // is recorded so a test can assert the update was scoped to empty columns.
      // `select().single()` is the other ending: the save reads its own row back.
      const builder = {
        eq: (column: string, value: unknown) => {
          record.filters.push({ column, operator: "eq", value });

          return builder;
        },
        is: (column: string, value: unknown) => {
          record.filters.push({ column, operator: "is", value });

          return builder;
        },
        select: (_columns: string) => ({
          single: () => saveProfileRow(values),
        }),
        // biome-ignore lint/suspicious/noThenProperty: the app awaits the end of a PostgREST chain, so the fake has to be awaitable the same way.
        then: (resolve: (result: { data: null; error: null }) => unknown) =>
          Promise.resolve(resolve({ data: null, error: null })),
      };

      return builder;
    },
  }));

  // The bucket, as a flat list. Enough to check what the app uploaded, what it
  // cleared afterwards, and that a picture is read back from the path it wrote.
  const objects: FakeStorageObject[] = [];
  let nextUploadError: Error | undefined;

  const storage = {
    from: (bucket: string) => ({
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `${STORAGE_PUBLIC_BASE}/${bucket}/${path}` },
      }),
      list: (prefix: string) =>
        Promise.resolve({
          data: objects
            .filter(
              (object) =>
                object.bucket === bucket && object.path.startsWith(`${prefix}/`)
            )
            .map((object) => ({ name: object.path.slice(prefix.length + 1) })),
          error: null,
        }),
      remove: (paths: string[]) => {
        for (const path of paths) {
          const index = objects.findIndex(
            (object) => object.bucket === bucket && object.path === path
          );

          if (index >= 0) {
            objects.splice(index, 1);
          }
        }

        return Promise.resolve({ data: null, error: null });
      },
      upload: (
        path: string,
        _body: unknown,
        fileOptions?: { contentType?: string }
      ) => {
        if (nextUploadError) {
          const error = nextUploadError;

          nextUploadError = undefined;

          return Promise.resolve({ data: null, error });
        }

        objects.push({
          bucket,
          contentType: fileOptions?.contentType ?? "",
          path,
        });

        return Promise.resolve({ data: { path }, error: null });
      },
    }),
  };

  const functions = {
    invoke: jest.fn((_name: string) =>
      Promise.resolve({ data: { deleted: true }, error: null })
    ),
  };

  const statusOf = (candidate: string) => {
    if (RESERVED_USERNAMES.has(candidate)) {
      return "reserved";
    }

    return taken.has(candidate) ? "taken" : "available";
  };

  const rpc = jest.fn((name: string, args: Record<string, unknown>) => {
    if (name === "username_status") {
      return options.usernameStatusError
        ? Promise.resolve({ data: null, error: options.usernameStatusError })
        : Promise.resolve({
            data: statusOf(args.candidate as string),
            error: null,
          });
    }

    if (name === "available_usernames") {
      const candidates = (args.candidates as string[]).slice(0, 10);

      return Promise.resolve({
        data: candidates.filter((value) => statusOf(value) === "available"),
        error: null,
      });
    }

    return Promise.resolve({ data: null, error: null });
  });

  return {
    auth,
    client: { auth, from, functions, rpc, storage } as never,
    emit,
    /** Makes the next save fail, for the id somebody took a moment earlier. */
    failNextSave: (error: Error) => {
      nextSaveError = error;
    },
    /** Makes the next picture upload fail, before the profile row is touched. */
    failNextUpload: (error: Error) => {
      nextUploadError = error;
    },
    from,
    functions,
    /**
     * Holds the next save in flight and answers with the release.
     *
     * A save that resolves immediately never shows its in-progress state, so a
     * test that wants to see one has to stop time somewhere the app is really
     * waiting.
     */
    holdNextSave: () => {
      let release = () => {
        // Replaced below.
      };

      saveGate = new Promise<void>((resolve) => {
        release = resolve;
      });

      return release;
    },
    /** Lets a held profile read succeed after it was made to fail. */
    recoverProfile: () => {
      profileError = undefined;
    },
    rpc,
    settleProfile: () => {
      settleProfile();
    },
    settleSession: () => {
      settleSession();
    },
    /** What the bucket holds now, so a test can assert an upload and a cleanup. */
    storedObjects: () => [...objects],
    /** The row as it stands, so a test can assert what the save wrote. */
    storedProfile: () => ({ ...profileRow }),
    updates,
  };
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;

let current = createFakeSupabase();

/** Installs a fresh fake for the next render. Call from beforeEach. */
export function resetFakeSupabase(options: FakeSupabaseOptions = {}) {
  current = createFakeSupabase(options);

  return current;
}

export function getFakeSupabase(): FakeSupabase {
  return current;
}
