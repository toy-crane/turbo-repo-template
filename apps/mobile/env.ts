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

const mobileEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: httpUrl,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: googleClientId,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: googleClientId,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
  EXPO_PUBLIC_SUPABASE_URL: httpUrl,
});

export type MobileEnv = z.infer<typeof mobileEnvSchema>;

export function parseMobileEnv(input: unknown): MobileEnv {
  const result = mobileEnvSchema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid mobile environment variables:\n${details}`);
  }

  return result.data;
}

export function getMobileEnv(): MobileEnv {
  return parseMobileEnv({
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  });
}
