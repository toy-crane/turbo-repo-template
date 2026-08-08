import "react-native-url-polyfill/auto";
import "expo-sqlite/localStorage/install";

import type { Database } from "@repo/supabase";
import { createClient } from "@supabase/supabase-js";

import { resolveSupabaseEnv } from "./env";

const { publishableKey, url } = resolveSupabaseEnv({
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
});

export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: false,
    persistSession: true,
    storage: localStorage,
  },
});
