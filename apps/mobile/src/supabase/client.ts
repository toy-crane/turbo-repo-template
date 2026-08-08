import "react-native-url-polyfill/auto";

import type { Database } from "@repo/supabase";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { resolveSupabaseEnv } from "./env";
import { secureSessionStorage } from "./secure-session-storage";

let client: SupabaseClient<Database> | undefined;

/**
 * Created on first use rather than at module scope. Throwing while the root
 * layout's module body evaluates happens before React mounts, so no error
 * boundary can catch it and `expo export` would still emit a bundle that dies
 * on launch.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!client) {
    const { publishableKey, url } = resolveSupabaseEnv({
      publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    });

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
