import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const GOOGLE_WEB_CLIENT_ID_ENV = "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID";
export const GOOGLE_IOS_CLIENT_ID_ENV = "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID";

const CLIENT_ID_SUFFIX = ".apps.googleusercontent.com";
const IOS_URL_SCHEME_PREFIX = "com.googleusercontent.apps.";

export interface GoogleEnv {
  iosClientId: string | undefined;
  webClientId: string | undefined;
}

/**
 * Google client ids are optional on purpose. The template ships without any, so
 * a project that only wants email sign-in still builds and runs; the sign-in
 * screen reports the missing configuration when someone presses the Google
 * button. Unlike the Supabase values, these cannot be required at build time.
 *
 * Both ids are public: they identify the app to Google and travel inside the
 * bundle either way. The Web client *secret* is a different value and belongs in
 * the Supabase Dashboard, never here.
 */
export function resolveGoogleEnv(): GoogleEnv {
  // A blank value means "not set". Raising instead would stop the app over a
  // stray space in a file that is allowed to leave these out entirely.
  const optionalClientId = z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined);
  const env = createEnv({
    client: {
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: optionalClientId,
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: optionalClientId,
    },
    clientPrefix: "EXPO_PUBLIC_",
    emptyStringAsUndefined: true,
    // Babel replaces each static `process.env.X` with a literal while bundling,
    // so every variable has to be named here rather than read off the object.
    runtimeEnvStrict: {
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    },
    server: {},
  });

  return {
    iosClientId: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  };
}

/**
 * Turns an iOS OAuth client id into the URL scheme iOS hands back to the Google
 * SDK after the account sheet closes. Google calls this the reversed client id.
 */
export function toIosUrlScheme(iosClientId: string): string {
  const clientId = iosClientId.trim();

  if (!clientId.endsWith(CLIENT_ID_SUFFIX)) {
    throw new Error(
      `${GOOGLE_IOS_CLIENT_ID_ENV} 값이 iOS client ID 형식이 아닙니다. "${CLIENT_ID_SUFFIX}"으로 끝나야 합니다. 받은 값: "${iosClientId}". README.md "Google 로그인 준비"를 참고하세요.`
    );
  }

  return `${IOS_URL_SCHEME_PREFIX}${clientId.slice(0, -CLIENT_ID_SUFFIX.length)}`;
}
