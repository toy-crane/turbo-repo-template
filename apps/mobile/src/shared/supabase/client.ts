import "react-native-url-polyfill/auto";

import { getMobileEnv } from "@env";
import type { Database } from "@repo/supabase";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { secureSessionStorage } from "./secure-session-storage";

let client: SupabaseClient<Database> | undefined;

/**
 * Created on first use rather than at module scope. Throwing while the root
 * layout's module body evaluates happens before React mounts, so no error
 * boundary can catch it and `expo export` would still emit a bundle that dies
 * on launch.
 *
 * app.config.ts verifies the complete mobile environment before Expo starts or
 * builds the app. This getter still consumes the typed contract so runtime code
 * cannot drift onto a separate list of required values.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!client) {
    const env = getMobileEnv();

    client = createClient<Database>(
      env.EXPO_PUBLIC_SUPABASE_URL,
      env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false,
          persistSession: true,
          storage: secureSessionStorage,
        },
      }
    );
  }

  return client;
}
