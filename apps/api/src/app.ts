import { AuthError } from "@supabase/server";
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
import { HTTPException } from "hono/http-exception";

import { resolveModelId } from "./env";

export interface AppDependencies {
  /**
   * The gate on the AI route. Tests replace it to reach the handler without a
   * real Supabase project; nothing else should.
   */
  auth?: MiddlewareHandler;
  /**
   * The model to call. Left unset, the server reads `AI_GATEWAY_MODEL` per
   * request, which is also what keeps tests off the real AI Gateway.
   */
  model?: LanguageModel;
}

const UNAUTHORIZED_STATUS = 401;

/**
 * The only way this server writes a failure down.
 *
 * Name and message, never the error object. An AI SDK call error carries the
 * request it sent as its own property, so printing the object would copy the
 * person's whole conversation into the server log.
 */
function logFailure(method: string, path: string, error: unknown): void {
  console.error(
    "Request failed on",
    method,
    path,
    error instanceof Error ? `${error.name}: ${error.message}` : "unknown error"
  );
}

export function createApp(dependencies: AppDependencies = {}): Hono {
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
    dependencies.auth ??
    withSupabase({
      auth: "user",
      env: { secretKeys: { default: "unused-ai-chat-never-calls-admin" } },
    });
  const app = new Hono();

  // Deliberately free of auth and of any model call: this answers whether the
  // server is deployed and running, nothing about the AI configuration.
  app.get("/health", (c) => c.json({ status: "ok" }));

  app.post("/ai/chat", requireUser, async (c) => {
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
      messages: await convertToModelMessages(messages.data),
      model: dependencies.model ?? resolveModelId(),
      // A provider failure after the response has started does not throw, so
      // `app.onError` never sees it. Without this the AI SDK's own default
      // runs `console.error(error)` on an error whose properties carry the
      // request it sent — the person's whole conversation — straight into the
      // server log.
      onError: ({ error }) => {
        logFailure(c.req.method, c.req.path, error);
      },
    });

    // The standalone helpers, not `result.toUIMessageStreamResponse()`: the
    // methods on the result are deprecated in ai 7 and go away in the next
    // major. Same bytes on the wire, and `toUIMessageStream` still masks
    // provider error text by default.
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  });

  app.onError((error, c) => {
    const cause = error instanceof HTTPException ? error.cause : undefined;

    if (cause instanceof AuthError && cause.status === UNAUTHORIZED_STATUS) {
      return c.json({ error: "Unauthorized." }, UNAUTHORIZED_STATUS);
    }

    // Everything else answers the same way on purpose. A missing environment
    // variable and a provider failure both describe the server's own setup,
    // and neither belongs in a response the app can read. It does belong in
    // the server's own log, though — without this the generic response is the
    // only trace the failure leaves.
    logFailure(c.req.method, c.req.path, error);

    return c.json({ error: "Internal server error." }, 500);
  });

  return app;
}
