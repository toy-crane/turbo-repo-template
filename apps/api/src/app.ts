import { AuthError } from "@supabase/server";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import {
  type AiChatDependencies,
  createAiChatRoutes,
} from "./features/ai-chat/route";
import { healthRoutes } from "./features/health/route";
import { logRequestFailure } from "./shared/request-log";

export type AppDependencies = AiChatDependencies;

const UNAUTHORIZED_STATUS = 401;

export function createApp(dependencies: AppDependencies = {}) {
  const app = new Hono()
    .route("/health", healthRoutes)
    .route("/ai/chat", createAiChatRoutes(dependencies));

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
    logRequestFailure(c.req.method, c.req.path, error);

    return c.json({ error: "Internal server error." }, 500);
  });

  return app;
}
