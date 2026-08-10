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

export interface FakeSupabaseOptions {
  /** Makes getSession hang until settleSession() runs, for the checking state. */
  holdSession?: boolean;
  session?: Session | null;
  sessionError?: Error;
}

export function createFakeUser(id = "user-1"): User {
  return {
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
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

export function createFakeSupabase(options: FakeSupabaseOptions = {}) {
  let session = options.session ?? null;
  let settleSession = () => {
    // Replaced below when the test asked to hold the first read.
  };
  const gate = options.holdSession
    ? new Promise<void>((resolve) => {
        settleSession = resolve;
      })
    : Promise.resolve();
  const listeners = new Set<AuthListener>();
  const updates: RecordedUpdate[] = [];

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

  const from = jest.fn((table: string) => ({
    update: (values: Record<string, unknown>) => {
      const record: RecordedUpdate = { filters: [], table, values };

      updates.push(record);

      // Thenable so `await` on the end of the chain resolves, and every filter
      // is recorded so a test can assert the update was scoped to empty columns.
      const builder = {
        eq: (column: string, value: unknown) => {
          record.filters.push({ column, operator: "eq", value });

          return builder;
        },
        is: (column: string, value: unknown) => {
          record.filters.push({ column, operator: "is", value });

          return builder;
        },
        // biome-ignore lint/suspicious/noThenProperty: the app awaits the end of a PostgREST chain, so the fake has to be awaitable the same way.
        then: (resolve: (result: { data: null; error: null }) => unknown) =>
          Promise.resolve(resolve({ data: null, error: null })),
      };

      return builder;
    },
  }));

  return {
    auth,
    client: { auth, from } as never,
    emit,
    from,
    settleSession: () => {
      settleSession();
    },
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
