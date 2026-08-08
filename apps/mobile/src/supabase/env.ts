export const SUPABASE_URL_ENV = "EXPO_PUBLIC_SUPABASE_URL";
export const SUPABASE_PUBLISHABLE_KEY_ENV =
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

export interface SupabaseEnv {
  publishableKey: string;
  url: string;
}

function readValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

export function resolveSupabaseEnv(values: {
  publishableKey: string | undefined;
  url: string | undefined;
}): SupabaseEnv {
  const url = readValue(values.url);
  const publishableKey = readValue(values.publishableKey);
  const missing: string[] = [];

  if (!url) {
    missing.push(SUPABASE_URL_ENV);
  }

  if (!publishableKey) {
    missing.push(SUPABASE_PUBLISHABLE_KEY_ENV);
  }

  if (!(url && publishableKey)) {
    throw new Error(
      `Supabase client is not configured. Set ${missing.join(" and ")} in apps/mobile/.env.local, then restart the bundler. See README.md "Supabase 연결".`
    );
  }

  return { publishableKey, url };
}
