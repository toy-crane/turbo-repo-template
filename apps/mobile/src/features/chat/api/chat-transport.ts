import { DefaultChatTransport, type UIMessage } from "ai";
import { fetch as expoFetch } from "expo/fetch";

export const CHAT_API_PATH = "/ai/chat";

// The scheme is the part people leave out, and "127.0.0.1:3900" reaches nothing
// from a Simulator.
const HTTP_URL = /^https?:\/\/\S+$/;
const TRAILING_SLASHES = /\/+$/;

/**
 * How the app talks to `POST /ai/chat`.
 *
 * The address is one the Simulator and the Emulator have to actually reach, so
 * it stays a value the person sets per machine. It is read as a static
 * `process.env.X` expression, which is the one form Expo replaces with a
 * literal while bundling.
 *
 * `getAccessToken` is a function rather than a token because the transport
 * resolves `headers` on every send. Passing the token itself would freeze
 * whatever was current when the screen mounted, and a refreshed session would
 * then be sent under a dead token.
 */
export function createChatTransport(
  getAccessToken: () => string | undefined
): DefaultChatTransport<UIMessage> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (!(baseUrl && HTTP_URL.test(baseUrl))) {
    throw new Error(
      'The API is not configured. Set EXPO_PUBLIC_API_URL in apps/mobile/.env.local, then restart the bundler. See README.md "Connecting to the API".'
    );
  }

  return new DefaultChatTransport<UIMessage>({
    api: `${baseUrl.replace(TRAILING_SLASHES, "")}${CHAT_API_PATH}`,
    // `expo/fetch` is what delivers the response in pieces on iOS and Android.
    // The global fetch in React Native waits for the whole body first, which
    // would turn a stream into a single late answer.
    fetch: expoFetch as unknown as typeof globalThis.fetch,
    headers: (): Record<string, string> => {
      const accessToken = getAccessToken();

      return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    },
  });
}
