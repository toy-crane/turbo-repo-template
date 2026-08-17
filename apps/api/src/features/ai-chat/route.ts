import { withSupabase } from "@supabase/server/adapters/hono";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  type LanguageModel,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
} from "ai";
import { Hono, type MiddlewareHandler } from "hono";

import { logRequestAbort, logRequestFailure } from "../../shared/request-log";
import { resolveModelId } from "./config";

export interface AiChatDependencies {
  /**
   * Authentication middleware for the AI route. Tests replace it to reach the
   * handler without a real Supabase project; nothing else should.
   */
  authMiddleware?: MiddlewareHandler;
  /**
   * The model to call. Left unset, the server reads `AI_GATEWAY_MODEL` per
   * request, which is also what keeps tests off the real AI Gateway.
   */
  model?: LanguageModel;
}

export function createAiChatRoutes(dependencies: AiChatDependencies = {}) {
  // Built once per app rather than per request, and applied to the AI route
  // only. An `app.use('*')` middleware would run before route middleware and
  // would take `/health` with it.
  //
  // The secret key override is a workaround, not a configuration choice.
  // `@supabase/server@1.4.1` builds `supabaseAdmin` eagerly for every auth
  // mode, so `auth: "user"` refuses to run without a secret key even though
  // its own docs say one is needed only for `auth: "secret"` or for actually
  // using `supabaseAdmin`. This route does neither, and giving the server a
  // real secret key would hand a route that never needs admin rights the power
  // to bypass every RLS policy. The placeholder keeps that power out of the
  // deployment; if a later route does call `supabaseAdmin`, it fails loudly
  // with this string instead of quietly succeeding. Remove it once the package
  // creates the admin client lazily.
  const requireUser =
    dependencies.authMiddleware ??
    withSupabase({
      auth: "user",
      env: { secretKeys: { default: "unused-ai-chat-never-calls-admin" } },
    });

  const requireCurrentUser: MiddlewareHandler = async (c, next) => {
    const { data, error } = await c.var.supabaseContext.supabase.auth.getUser();

    if (error || !data.user) {
      return c.json({ error: "Unauthorized." }, 401);
    }

    await next();
  };

  return new Hono().post("/", requireUser, requireCurrentUser, async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    const messages = await safeValidateUIMessages({
      messages: (body as { messages?: unknown } | null)?.messages,
    });

    // Returning here is what keeps a malformed body from reaching the model,
    // so a bad request never costs a generation.
    if (!messages.success) {
      return c.json({ error: "Invalid request body." }, 400);
    }

    const result = streamText({
      // The request's own signal: when the app stops generation or the
      // connection drops, the model call stops burning tokens with it.
      abortSignal: c.req.raw.signal,
      messages: await convertToModelMessages(messages.data),
      model: dependencies.model ?? resolveModelId(),
      onAbort: () => {
        logRequestAbort(c.req.method, c.req.path);
      },
      // A provider failure after the response has started does not throw, so
      // `app.onError` never sees it. Without this the AI SDK's own default runs
      // `console.error(error)` on an error whose properties carry the request
      // it sent — the person's whole conversation — straight into the server
      // log.
      onError: ({ error }) => {
        logRequestFailure(c.req.method, c.req.path, error);
      },
    });

    // The standalone helpers, not `result.toUIMessageStreamResponse()`: the
    // methods on the result are deprecated in ai 7 and go away in the next
    // major. Same bytes on the wire, and `toUIMessageStream` still masks
    // provider error text by default.
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        // Explicit rather than the default: the response contract is text
        // only, and it has to hold even if `AI_GATEWAY_MODEL` is switched to
        // a reasoning model later.
        sendReasoning: false,
        stream: result.stream,
      }),
    });
  });
}
