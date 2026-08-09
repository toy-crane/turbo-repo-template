import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const API_URL_ENV = "EXPO_PUBLIC_API_URL";

const TRAILING_SLASHES = /\/+$/;

function missingVariableError(): Error {
  return new Error(
    `The API is not configured. Set ${API_URL_ENV} in apps/mobile/.env.local, then restart the bundler. See README.md "Connecting to the API".`
  );
}

/**
 * Reads the base address of the Hono API.
 *
 * The address has to be one the Simulator and the Emulator can actually reach,
 * so it stays a value the person sets per machine rather than something the app
 * derives. See `src/supabase/env.ts` for why every variable is named here
 * instead of handing `process.env` to the validator.
 */
export function resolveApiBaseUrl(): string {
  const env = createEnv({
    client: {
      EXPO_PUBLIC_API_URL: z.string().trim().url(),
    },
    clientPrefix: "EXPO_PUBLIC_",
    emptyStringAsUndefined: true,
    onValidationError: () => {
      throw missingVariableError();
    },
    runtimeEnvStrict: {
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    },
    server: {},
  });

  return env.EXPO_PUBLIC_API_URL.replace(TRAILING_SLASHES, "");
}
