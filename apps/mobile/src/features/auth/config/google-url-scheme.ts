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

  if (!clientId.endsWith(CLIENT_ID_SUFFIX)) {
    throw new Error(
      `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID 값이 iOS client ID 형식이 아닙니다. "${CLIENT_ID_SUFFIX}"으로 끝나야 합니다. 받은 값: "${iosClientId}". README.md "Google 로그인 준비"를 참고하세요.`
    );
  }

  return `${IOS_URL_SCHEME_PREFIX}${clientId.slice(0, -CLIENT_ID_SUFFIX.length)}`;
}
