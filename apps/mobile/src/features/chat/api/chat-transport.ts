import { getMobileEnv } from "@env";
import {
  DefaultChatTransport,
  type PrepareSendMessagesRequest,
  type UIMessage,
} from "ai";
import { fetch as expoFetch } from "expo/fetch";

export const CHAT_API_PATH = "/ai/chat";

const TRAILING_SLASHES = /\/+$/;

/**
 * The one address and the one way of authorising a request to `POST /ai/chat`.
 *
 * The address is one the Simulator and the Emulator have to actually reach, so
 * it stays a value the person sets per machine. The shared mobile environment
 * contract validates it before Expo starts or builds the app.
 *
 * `getAccessToken` is a function rather than a token because the transport
 * resolves `headers` on every send. Passing the token itself would freeze
 * whatever was current when the screen mounted, and a refreshed session would
 * then be sent under a dead token.
 */
function chatRequestOptions(getAccessToken: () => string | undefined) {
  const { EXPO_PUBLIC_API_URL: baseUrl } = getMobileEnv();

  return {
    api: `${baseUrl.replace(TRAILING_SLASHES, "")}${CHAT_API_PATH}`,
    // `expo/fetch` is what delivers the response in pieces on iOS and Android.
    // The global fetch in React Native waits for the whole body first, which
    // would turn a stream into a single late answer.
    fetch: expoFetch as unknown as typeof globalThis.fetch,
    headers: (): Record<string, string> => {
      const accessToken = getAccessToken();

      return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    },
  };
}

/** How the app talks to `POST /ai/chat` for a conversation of its own. */
export function createChatTransport(
  getAccessToken: () => string | undefined
): DefaultChatTransport<UIMessage> {
  return new DefaultChatTransport<UIMessage>(
    chatRequestOptions(getAccessToken)
  );
}

/**
 * The parent conversation in front of the side chat's own messages.
 *
 * This is the whole of what a side chat adds to the protocol: the same body
 * the transport would have built on its own, with the snapshot ahead of
 * `messages`. Everything else is passed through, so a side chat request stays
 * the request the route already answers.
 */
export function prependParentSnapshot(
  snapshot: UIMessage[]
): PrepareSendMessagesRequest<UIMessage> {
  return ({ body, id, messageId, messages, trigger }) => ({
    body: {
      ...body,
      id,
      messageId,
      messages: [...snapshot, ...messages],
      trigger,
    },
  });
}

/**
 * How a side chat talks to the same route, carrying the parent conversation.
 *
 * The snapshot goes with every request, so the model reads the conversation
 * the phrase came from without any of it entering the side chat's own message
 * list. It is fixed when the side chat opens and never written back: the
 * server stores nothing and this transport asks it for nothing.
 */
export function createSideChatTransport(
  getAccessToken: () => string | undefined,
  snapshot: UIMessage[]
): DefaultChatTransport<UIMessage> {
  return new DefaultChatTransport<UIMessage>({
    ...chatRequestOptions(getAccessToken),
    prepareSendMessagesRequest: prependParentSnapshot(snapshot),
  });
}
