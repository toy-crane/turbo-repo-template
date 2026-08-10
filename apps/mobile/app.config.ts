import type { ConfigContext, ExpoConfig } from "expo/config";

import { toIosUrlScheme } from "./src/features/auth/config/google-url-scheme.ts";

const REQUIRED_PUBLIC_VARIABLES = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

/**
 * Stops a build that would produce an app nobody can sign in to.
 *
 * This file runs in Node rather than through Metro, so the names can be read
 * off `process.env` here. App code cannot do the same: the bundler replaces
 * each static `process.env.X` with a literal and leaves the object empty.
 */
function assertSupabaseConfigured(): void {
  const missing = REQUIRED_PUBLIC_VARIABLES.filter(
    (name) => !process.env[name]?.trim()
  );

  if (missing.length > 0) {
    throw new Error(
      `Supabase is not configured. Set ${missing.join(" and ")} in apps/mobile/.env.local, then restart the bundler. See README.md "Connecting to Supabase".`
    );
  }
}

/**
 * Static values stay in app.json; this file only adds a build-time gate.
 *
 * Every Expo CLI command that resolves this config — `start`, `prebuild`,
 * `run:*`, `export`, `install` — loads the `.env` files first, so the values
 * are already on `process.env` by the time this runs. Throwing here fails the
 * command instead of producing a bundle whose first screen is an error.
 *
 * Jest resolves the config too, before setup files run, so the check steps
 * aside under the test runner.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  if (process.env.JEST_WORKER_ID) {
    return config as ExpoConfig;
  }

  assertSupabaseConfigured();

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
