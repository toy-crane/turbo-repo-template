import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const SUPABASE_URL_ENV = "EXPO_PUBLIC_SUPABASE_URL";
export const SUPABASE_PUBLISHABLE_KEY_ENV =
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

export interface SupabaseEnv {
  publishableKey: string;
  url: string;
}

function missingVariablesError(names: string[]): Error {
  return new Error(
    `Supabase is not configured. Set ${names.join(" and ")} in apps/mobile/.env.local, then restart the bundler. See README.md "Connecting to Supabase".`
  );
}

/**
 * Reads the public Supabase configuration.
 *
 * `EXPO_PUBLIC_` values reach the device because Babel replaces each static
 * `process.env.X` expression with a literal while bundling — the object itself
 * is not populated at runtime. So every variable is listed explicitly here
 * rather than handing `process.env` to the validator, which would validate
 * fine on a build machine and come back undefined on a phone.
 *
 * The empty `server` block is the point of using this validator today: a value
 * that must not ship to the device goes there, and the prefix rule then makes
 * putting it in `client` — or reading it from app code — an error.
 */
export function resolveSupabaseEnv(): SupabaseEnv {
  const env = createEnv({
    client: {
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
      EXPO_PUBLIC_SUPABASE_URL: z.string().trim().url(),
    },
    clientPrefix: "EXPO_PUBLIC_",
    emptyStringAsUndefined: true,
    onValidationError: (issues) => {
      const names = issues
        .map((issue) => String(issue.path?.[0] ?? ""))
        .filter(Boolean);

      throw missingVariablesError([...new Set(names)]);
    },
    runtimeEnvStrict: {
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    },
    server: {},
  });

  return {
    publishableKey: env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    url: env.EXPO_PUBLIC_SUPABASE_URL,
  };
}
