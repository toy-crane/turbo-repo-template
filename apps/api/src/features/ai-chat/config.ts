export const MODEL_ENV = "AI_GATEWAY_MODEL";

/**
 * The model this feature calls, read from configuration rather than the
 * request.
 *
 * Reading it per request rather than at import time is what keeps `/health`
 * answering while the AI configuration is missing or wrong: only the AI route
 * ever asks for this value. `@supabase/server` and the AI SDK own the rest of
 * the server's environment — `SUPABASE_URL`, `SUPABASE_JWKS_URL` and
 * `AI_GATEWAY_API_KEY` are read by those packages, so this file does not repeat
 * them.
 */
export function resolveModelId(): string {
  const modelId = process.env[MODEL_ENV]?.trim();

  if (!modelId) {
    throw new Error(
      `${MODEL_ENV} is not set. Copy apps/api/.env.example to apps/api/.env.local and set a provider/model identifier.`
    );
  }

  return modelId;
}
