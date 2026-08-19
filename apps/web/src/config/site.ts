/**
 * Values this site shows to people, kept in one place because most of them are
 * promises made to an app store or required by law rather than copy.
 */

/** The domain RFC 2606 reserves for examples, so an address using it is unmistakably unset. */
const PLACEHOLDER_DOMAIN = "example.com";

/** Stands in for a name nobody has chosen yet. */
const PLACEHOLDER_TEXT = "미정";

/** The name this template ships with. Still carrying it means the app was never renamed. */
const TEMPLATE_APP_NAME = "Turbo Repo Mobile";

/**
 * Must match the app name on the store listing. Expo's `expo.name` owns that
 * name today and `bun run setup` writes it; `site.test.ts` fails when the two
 * drift apart.
 */
export const APP_NAME = TEMPLATE_APP_NAME;

/** Whoever operates the service. The terms call this party 회사 after defining it. */
export const OPERATOR_NAME = PLACEHOLDER_TEXT;

/** Where account deletion requests arrive. Registered in Play Console's Data safety form. */
export const SUPPORT_EMAIL = `support@${PLACEHOLDER_DOMAIN}`;

/**
 * The person or team the Personal Information Protection Act requires a privacy
 * policy to name, together with a way to reach them. Both halves are required,
 * so both are tracked below.
 */
export const PRIVACY_OFFICER = {
  email: `privacy@${PLACEHOLDER_DOMAIN}`,
  name: PLACEHOLDER_TEXT,
  role: "개인정보 보호책임자",
} as const;

/**
 * Who runs the model behind the chat feature. `AI_GATEWAY_MODEL` picks it at
 * deploy time and the code deliberately pins no model, so the operator has to
 * name the one they actually route to: it receives the text people type.
 */
export const AI_MODEL_PROVIDER = PLACEHOLDER_TEXT;

/**
 * The date the terms and the privacy policy take effect. Both are drafts until a
 * person reviews them, and a date is the one thing on a legal page a reader takes
 * at face value, so it stays a placeholder until that review sets a real one.
 */
export const DOCUMENT_EFFECTIVE_DATE = PLACEHOLDER_TEXT;

/** Store pages, once the app is listed. An empty url renders as unavailable rather than as a broken link. */
export const STORE_LINKS = [
  { label: "App Store", url: "" },
  { label: "Google Play", url: "" },
] as const;

export function isPlaceholder(value: string): boolean {
  return (
    value === PLACEHOLDER_TEXT ||
    value === TEMPLATE_APP_NAME ||
    value.endsWith(`@${PLACEHOLDER_DOMAIN}`)
  );
}

export interface TrackedValue {
  label: string;
  value: string;
}

/** The labels of the entries still holding a placeholder, in the order given. */
export function collectPlaceholders(
  entries: readonly TrackedValue[]
): string[] {
  return entries
    .filter((entry) => isPlaceholder(entry.value))
    .map((entry) => entry.label);
}

/**
 * Everything a reader or a store reviewer would take as fact. The layout names
 * these on every page so none of them can reach a store listing unnoticed.
 */
export const PLACEHOLDERS_IN_USE = collectPlaceholders([
  { label: "앱 이름", value: APP_NAME },
  { label: "운영자 이름", value: OPERATOR_NAME },
  { label: "지원 메일 주소", value: SUPPORT_EMAIL },
  { label: "개인정보 보호책임자 이름", value: PRIVACY_OFFICER.name },
  { label: "개인정보 보호책임자 연락처", value: PRIVACY_OFFICER.email },
  { label: "AI 모델 제공자", value: AI_MODEL_PROVIDER },
  { label: "약관과 방침 시행일", value: DOCUMENT_EFFECTIVE_DATE },
]);
