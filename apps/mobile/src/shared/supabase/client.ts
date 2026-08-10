import "react-native-url-polyfill/auto";

import type { Database } from "@repo/supabase";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { secureSessionStorage } from "./secure-session-storage";

// The scheme is the part people leave out, and "127.0.0.1:54321" reaches
// nothing from a Simulator.
const HTTP_URL = /^https?:\/\/\S+$/;

let client: SupabaseClient<Database> | undefined;

function configurationError(names: string[]): Error {
  return new Error(
    `Supabase is not configured. Set ${names.join(" and ")} in apps/mobile/.env.local, then restart the bundler. See README.md "Connecting to Supabase".`
  );
}

/**
 * Created on first use rather than at module scope. Throwing while the root
 * layout's module body evaluates happens before React mounts, so no error
 * boundary can catch it and `expo export` would still emit a bundle that dies
 * on launch.
 *
 * Both values are read as static `process.env.X` expressions, which is the one
 * form Expo replaces with a literal while bundling; the object itself is empty
 * on a device, so a computed name would come back undefined there. app.config.ts
 * checks the same two names before a build starts.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!client) {
    // A blank value counts as unset: a stray space in .env.local must not read
    // as configuration.
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
    const publishableKey =
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

    if (!(url && publishableKey)) {
      throw configurationError(
        [
          url ? "" : "EXPO_PUBLIC_SUPABASE_URL",
          publishableKey ? "" : "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        ].filter(Boolean)
      );
    }

    if (!HTTP_URL.test(url)) {
      throw configurationError(["EXPO_PUBLIC_SUPABASE_URL"]);
    }

    client = createClient<Database>(url, publishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: secureSessionStorage,
      },
    });
  }

  return client;
}
