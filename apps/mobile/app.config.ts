import type { ConfigContext, ExpoConfig } from "expo/config";

import { getMobileEnv } from "./env.ts";
import { toIosUrlScheme } from "./src/features/auth/config/google-url-scheme.ts";

/**
 * Static values stay in app.json; this file adds the environment gate and the
 * Google URL scheme that depends on a validated public value.
 *
 * Every Expo CLI command that resolves this config — `start`, `prebuild`,
 * `run:*`, `export`, `install` — loads the `.env` files first, so the values
 * are already on `process.env` by the time this runs. Throwing here fails the
 * command instead of producing a bundle whose first screen is an error.
 *
 * Jest resolves the config before setup files provide explicit test values, so
 * only that config lookup steps aside. Expo's dependency and route type checks
 * also need only static project values, so they use the same config without
 * product values. App modules still validate the complete test contract when
 * they run, and every normal Expo command keeps this gate.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  if (
    process.env.JEST_WORKER_ID ||
    process.env.MOBILE_EXPO_STATIC_CONFIG === "1"
  ) {
    return config as ExpoConfig;
  }

  const env = getMobileEnv();

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        "react-native-nitro-google-signin",
        {
          iosUrlScheme: toIosUrlScheme(env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
        },
      ],
    ],
  } as ExpoConfig;
};
