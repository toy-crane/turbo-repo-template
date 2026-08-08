import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type IdentitySource = "displayName" | "mobileAppId" | "projectSlug";

export interface IdentityValues {
  displayName: string;
  mobileAppId: string;
  projectSlug: string;
}

export interface IdentityChange {
  field: IdentityField;
  from: string;
  to: string;
}

interface IdentityField {
  file: string;
  format: "json" | "toml";
  key: string;
  label: string;
  path: string[];
  source: IdentitySource;
  templateDefault: string;
}

const TEMPLATE_SLUG = "turbo-repo-template";
const TEMPLATE_MOBILE_SLUG = "turbo-repo-mobile";
const TEMPLATE_MOBILE_APP_ID = "com.toycrane.turborepotemplate.mobile";

/**
 * Every identifier setup owns. Nothing outside this list is rewritten, so a
 * string that merely looks like the template name stays untouched.
 */
export const IDENTITY_FIELDS: IdentityField[] = [
  {
    file: "package.json",
    format: "json",
    key: "name",
    label: "루트 package name",
    path: ["name"],
    source: "projectSlug",
    templateDefault: TEMPLATE_SLUG,
  },
  {
    file: "apps/mobile/app.json",
    format: "json",
    key: "name",
    label: "Expo 표시 이름",
    path: ["expo", "name"],
    source: "displayName",
    templateDefault: "Turbo Repo Mobile",
  },
  {
    file: "apps/mobile/app.json",
    format: "json",
    key: "slug",
    label: "Expo slug",
    path: ["expo", "slug"],
    source: "projectSlug",
    templateDefault: TEMPLATE_MOBILE_SLUG,
  },
  {
    file: "apps/mobile/app.json",
    format: "json",
    key: "scheme",
    label: "Expo scheme",
    path: ["expo", "scheme"],
    source: "projectSlug",
    templateDefault: TEMPLATE_MOBILE_SLUG,
  },
  {
    file: "apps/mobile/app.json",
    format: "json",
    key: "bundleIdentifier",
    label: "iOS bundleIdentifier",
    path: ["expo", "ios", "bundleIdentifier"],
    source: "mobileAppId",
    templateDefault: TEMPLATE_MOBILE_APP_ID,
  },
  {
    file: "apps/mobile/app.json",
    format: "json",
    key: "package",
    label: "Android package",
    path: ["expo", "android", "package"],
    source: "mobileAppId",
    templateDefault: TEMPLATE_MOBILE_APP_ID,
  },
  {
    file: "supabase/config.toml",
    format: "toml",
    key: "project_id",
    label: "Supabase project_id",
    path: ["project_id"],
    source: "projectSlug",
    templateDefault: TEMPLATE_SLUG,
  },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readJsonPath(text: string, path: string[], file: string): string {
  let node: unknown = JSON.parse(text);

  for (const key of path) {
    if (typeof node !== "object" || node === null || !(key in node)) {
      throw new Error(`${file}에서 ${path.join(".")} 필드를 찾지 못했습니다.`);
    }

    node = (node as Record<string, unknown>)[key];
  }

  if (typeof node !== "string") {
    throw new Error(`${file}의 ${path.join(".")} 값이 문자열이 아닙니다.`);
  }

  return node;
}

function readTomlKey(text: string, key: string, file: string): string {
  const pattern = new RegExp(
    `^${escapeRegExp(key)}\\s*=\\s*"([^"]*)"\\s*$`,
    "m"
  );
  const match = text.match(pattern);

  if (!match?.[1]) {
    throw new Error(`${file}에서 ${key} 값을 찾지 못했습니다.`);
  }

  return match[1];
}

function readField(root: string, field: IdentityField): string {
  const text = readFileSync(join(root, field.file), "utf8");

  return field.format === "json"
    ? readJsonPath(text, field.path, field.file)
    : readTomlKey(text, field.key, field.file);
}

export function readIdentity(root: string): Map<IdentityField, string> {
  return new Map(
    IDENTITY_FIELDS.map((field) => [field, readField(root, field)])
  );
}

export function isConfigured(current: Map<IdentityField, string>): boolean {
  return IDENTITY_FIELDS.some(
    (field) => current.get(field) !== field.templateDefault
  );
}

export function planIdentityChanges(
  current: Map<IdentityField, string>,
  values: IdentityValues
): IdentityChange[] {
  return IDENTITY_FIELDS.flatMap((field) => {
    const from = current.get(field) ?? "";
    const to = values[field.source];

    return from === to ? [] : [{ field, from, to }];
  });
}

/**
 * Replace exactly one `"key": "old"` (or `key = "old"`) occurrence. Anything
 * else means the file no longer matches what setup knows how to edit, so it
 * fails instead of guessing.
 */
function replaceSingleValue(
  text: string,
  change: IdentityChange,
  pattern: RegExp
): string {
  const matches = text.match(pattern);

  if (matches?.length !== 1) {
    throw new Error(
      `${change.field.file}에서 ${change.field.key} = "${change.from}" 항목을 정확히 하나 찾지 못했습니다 (${matches?.length ?? 0}개). 파일을 확인한 뒤 다시 실행하세요.`
    );
  }

  return text.replace(
    pattern,
    (_match, prefix: string) => `${prefix}${JSON.stringify(change.to)}`
  );
}

function rewriteFile(root: string, changes: IdentityChange[], file: string) {
  const absolute = join(root, file);
  let text = readFileSync(absolute, "utf8");

  for (const change of changes) {
    const { format, key } = change.field;
    const pattern =
      format === "json"
        ? new RegExp(
            `("${escapeRegExp(key)}"\\s*:\\s*)"${escapeRegExp(change.from)}"`,
            "g"
          )
        : new RegExp(
            `^(${escapeRegExp(key)}\\s*=\\s*)"${escapeRegExp(change.from)}"$`,
            "gm"
          );

    text = replaceSingleValue(text, change, pattern);
  }

  writeFileSync(absolute, text);

  for (const change of changes) {
    const applied = readField(root, change.field);

    if (applied !== change.to) {
      throw new Error(
        `${file}의 ${change.field.label}이(가) "${change.to}"로 적용되지 않았습니다.`
      );
    }
  }
}

export function applyIdentityChanges(root: string, changes: IdentityChange[]) {
  const files = [...new Set(changes.map((change) => change.field.file))];

  for (const file of files) {
    rewriteFile(
      root,
      changes.filter((change) => change.field.file === file),
      file
    );
  }
}
