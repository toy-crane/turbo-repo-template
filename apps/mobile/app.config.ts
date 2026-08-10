import { loadProjectEnv } from "@expo/env";
import type { ConfigContext, ExpoConfig } from "expo/config";

import { toIosUrlScheme } from "./src/features/auth/config/google-env.ts";
import { resolveSupabaseEnv } from "./src/shared/supabase/env.ts";

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
  if (process.env.JEST_WORKER_ID) {
    return config as ExpoConfig;
  }

  // biome-ignore lint/correctness/noGlobalDirnameFilename: the Expo CLI loads this file as CommonJS, where import.meta is unavailable.
  loadProjectEnv(__dirname);
  resolveSupabaseEnv();

  // The Google config plugin refuses to run without an iOS URL scheme, which
  // only exists once a project has its own iOS OAuth client. Adding the plugin
  // unconditionally would fail `prebuild` for every project that has not set
  // Google up yet — including a fresh copy of this template. So the plugin is
  // added when the id is there, and the sign-in screen reports the missing
  // configuration when it is not.
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

  if (!iosClientId) {
    return config as ExpoConfig;
  }

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        "react-native-nitro-google-signin",
        { iosUrlScheme: toIosUrlScheme(iosClientId) },
      ],
    ],
  } as ExpoConfig;
};
