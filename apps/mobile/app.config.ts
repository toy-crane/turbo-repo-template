import type { ConfigContext, ExpoConfig } from "expo/config";

import { resolveSupabaseEnv } from "./src/supabase/env.ts";

/**
 * Static values stay in app.json; this file only adds a build-time gate.
 *
 * Expo resolves the app config for `start`, `prebuild`, `run:*`, and `export`,
 * so throwing here fails the command instead of producing a bundle whose first
 * screen is an error. Jest resolves the config too, before setup files run, so
 * the check steps aside under the test runner.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  if (!process.env.JEST_WORKER_ID) {
    resolveSupabaseEnv({
      publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    });
  }

  return config as ExpoConfig;
};
