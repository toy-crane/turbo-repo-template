import { loadProjectEnv } from "@expo/env";
import type { ConfigContext, ExpoConfig } from "expo/config";

import { resolveSupabaseEnv } from "./src/supabase/env.ts";

/**
 * Static values stay in app.json; this file only adds a build-time gate.
 *
 * Expo resolves the app config for `start`, `prebuild`, `run:*`, and `export`,
 * so throwing here fails the command instead of producing a bundle whose first
 * screen is an error. `export` reads the config *before* it loads .env files,
 * so load them here first — otherwise a correctly configured project fails.
 * Jest resolves the config too, before setup files run, so the check steps
 * aside under the test runner.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  if (!process.env.JEST_WORKER_ID) {
    // biome-ignore lint/correctness/noGlobalDirnameFilename: the Expo CLI loads this file as CommonJS, where import.meta is unavailable.
    loadProjectEnv(__dirname);
    resolveSupabaseEnv();
  }

  return config as ExpoConfig;
};
