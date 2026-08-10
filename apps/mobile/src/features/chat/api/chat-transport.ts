import { DefaultChatTransport, type UIMessage } from "ai";
import { fetch as expoFetch } from "expo/fetch";

import { resolveApiBaseUrl } from "@/features/chat/config/api-env";

export const CHAT_API_PATH = "/ai/chat";

/**
 * How the app talks to `POST /ai/chat`.
 *
 * `getAccessToken` is a function rather than a token because the transport
 * resolves `headers` on every send. Passing the token itself would freeze
 * whatever was current when the screen mounted, and a refreshed session would
 * then be sent under a dead token.
 */
export function createChatTransport(
  getAccessToken: () => string | undefined
): DefaultChatTransport<UIMessage> {
  return new DefaultChatTransport<UIMessage>({
    api: `${resolveApiBaseUrl()}${CHAT_API_PATH}`,
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
