const CLIENT_ID_SUFFIX = ".apps.googleusercontent.com";
const IOS_URL_SCHEME_PREFIX = "com.googleusercontent.apps.";

/**
 * Turns an iOS OAuth client id into the URL scheme iOS hands back to the Google
 * SDK after the account sheet closes. Google calls this the reversed client id.
 *
 * Only `app.config.ts` calls this: the scheme belongs to the native project the
 * Google config plugin generates, not to anything the running app reads. The
 * client ids themselves are public — they identify the app to Google and travel
 * inside the bundle either way. The Web client *secret* is a different value and
 * belongs in the Supabase Dashboard, never here.
 */
export function toIosUrlScheme(iosClientId: string): string {
  const clientId = iosClientId.trim();

  return `${IOS_URL_SCHEME_PREFIX}${clientId.slice(0, -CLIENT_ID_SUFFIX.length)}`;
}
