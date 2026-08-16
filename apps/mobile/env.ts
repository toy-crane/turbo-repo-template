import { z } from "zod";

const googleClientId = z
  .string()
  .trim()
  .regex(/^[\w-]+\.apps\.googleusercontent\.com$/);

const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    try {
      const { protocol } = new URL(value);

      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  });

const port = z.coerce.number().int().positive().max(65_535);

const mobileEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: httpUrl,
  EXPO_PUBLIC_DEV_SESSION_API_PORT: port.optional(),
  EXPO_PUBLIC_DEV_SESSION_SUPABASE_PORT: port.optional(),
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: googleClientId,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: googleClientId,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
  EXPO_PUBLIC_SUPABASE_URL: httpUrl,
});

type MobileEnvSource = z.infer<typeof mobileEnvSchema>;

export type MobileEnv = Omit<
  MobileEnvSource,
  "EXPO_PUBLIC_DEV_SESSION_API_PORT" | "EXPO_PUBLIC_DEV_SESSION_SUPABASE_PORT"
>;

/**
 * Where the development machine answers, seen from the given platform. An
 * Android emulator reaches the host's loopback services through `10.0.2.2`;
 * there `127.0.0.1` is the emulator itself. Anything else, including an unset
 * platform outside a bundle, uses the loopback address directly.
 */
export function developmentSessionHost(platform: string | undefined): string {
  return platform === "android" ? "10.0.2.2" : "127.0.0.1";
}

export function parseMobileEnv(input: unknown): MobileEnv {
  const result = mobileEnvSchema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid mobile environment variables:\n${details}`);
  }

  const {
    EXPO_PUBLIC_DEV_SESSION_API_PORT,
    EXPO_PUBLIC_DEV_SESSION_SUPABASE_PORT,
    ...environment
  } = result.data;
  // `babel-preset-expo` replaces this with the platform of the bundle it is
  // building, so one Metro hands each platform its own host while the value
  // the session passes in stays the same for both.
  const host = developmentSessionHost(process.env.EXPO_OS);
  const sessionUrl = (sessionPort: number | undefined) =>
    sessionPort === undefined ? undefined : `http://${host}:${sessionPort}`;

  return {
    ...environment,
    EXPO_PUBLIC_API_URL:
      sessionUrl(EXPO_PUBLIC_DEV_SESSION_API_PORT) ??
      environment.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_SUPABASE_URL:
      sessionUrl(EXPO_PUBLIC_DEV_SESSION_SUPABASE_PORT) ??
      environment.EXPO_PUBLIC_SUPABASE_URL,
  };
}

export function getMobileEnv(): MobileEnv {
  return parseMobileEnv({
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_DEV_SESSION_API_PORT:
      process.env.EXPO_PUBLIC_DEV_SESSION_API_PORT,
    EXPO_PUBLIC_DEV_SESSION_SUPABASE_PORT:
      process.env.EXPO_PUBLIC_DEV_SESSION_SUPABASE_PORT,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  });
}
