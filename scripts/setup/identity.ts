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

export interface IdentityField {
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

/** The start of any TOML table header, used to find where a table ends. */
const TABLE_HEADER = /^\[/m;

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
  {
    file: "supabase/config.toml",
    format: "toml",
    key: "client_id",
    label: "Supabase Apple client_id",
    path: ["auth.external.apple", "client_id"],
    source: "mobileAppId",
    templateDefault: "",
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

/**
 * The table a TOML field lives under, or `undefined` for a key above the first
 * table header. A path of one element is top-level; a longer one names its
 * table first.
 */
function tableOf(field: IdentityField): string | undefined {
  return field.path.length > 1 ? field.path[0] : undefined;
}

/**
 * The slice of the file a TOML field may be read from or written to. Keys
 * repeat across tables — `client_id` appears under both Google and Apple — so
 * matching the whole file would silently pick whichever came first.
 */
function tableRange(text: string, field: IdentityField): [number, number] {
  const table = tableOf(field);

  if (table === undefined) {
    const firstHeader = text.search(TABLE_HEADER);

    return [0, firstHeader === -1 ? text.length : firstHeader];
  }

  const header = text.match(new RegExp(`^\\[${escapeRegExp(table)}\\]$`, "m"));

  if (header?.index === undefined) {
    throw new Error(`${field.file}에서 [${table}] 블록을 찾지 못했습니다.`);
  }

  const start = header.index + header[0].length;
  const nextHeader = text.slice(start).search(TABLE_HEADER);

  return [start, nextHeader === -1 ? text.length : start + nextHeader];
}

function readTomlKey(text: string, field: IdentityField): string {
  const [start, end] = tableRange(text, field);
  const pattern = new RegExp(
    `^${escapeRegExp(field.key)}\\s*=\\s*"([^"]*)"\\s*$`,
    "m"
  );
  const match = text.slice(start, end).match(pattern);

  if (match?.[1] === undefined) {
    throw new Error(`${field.file}에서 ${field.label} 값을 찾지 못했습니다.`);
  }

  return match[1];
}

function readValue(text: string, field: IdentityField): string {
  return field.format === "json"
    ? readJsonPath(text, field.path, field.file)
    : readTomlKey(text, field);
}

function readField(root: string, field: IdentityField): string {
  return readValue(readFileSync(join(root, field.file), "utf8"), field);
}

export function readIdentity(root: string): Map<IdentityField, string> {
  return new Map(
    IDENTITY_FIELDS.map((field) => [field, readField(root, field)])
  );
}

/**
 * Configured means no field still holds its template default. `some` would let
 * a single hand-edited field lock the wizard out of the other six, and would
 * make a half-applied run unrecoverable without `--force`.
 */
export function isConfigured(current: Map<IdentityField, string>): boolean {
  return IDENTITY_FIELDS.every(
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
 * Match the key and capture whatever quoted string follows, then compare the
 * decoded value. Building the pattern from the raw value instead would never
 * match a name the file had to escape, such as a display name with quotes.
 */
function patternFor(field: IdentityField): RegExp {
  const quoted = String.raw`"(?:[^"\\]|\\.)*"`;

  return field.format === "json"
    ? new RegExp(`("${escapeRegExp(field.key)}"\\s*:\\s*)(${quoted})`, "g")
    : new RegExp(`^(${escapeRegExp(field.key)}\\s*=\\s*)(${quoted})$`, "gm");
}

/**
 * Replace exactly one occurrence. Anything else means the file no longer looks
 * like what setup knows how to edit, so it fails instead of guessing.
 */
function replaceSingleValue(text: string, change: IdentityChange): string {
  const [start, end] =
    change.field.format === "toml"
      ? tableRange(text, change.field)
      : [0, text.length];
  const scope = text.slice(start, end);
  const pattern = patternFor(change.field);
  const hits = [...scope.matchAll(pattern)].filter(
    (match) => match[2] !== undefined && JSON.parse(match[2]) === change.from
  );

  if (hits.length !== 1) {
    throw new Error(
      `${change.field.file}에서 ${change.field.key} = "${change.from}" 항목을 정확히 하나 찾지 못했습니다 (${hits.length}개). 파일을 확인한 뒤 다시 실행하세요.`
    );
  }

  const replaced = scope.replace(
    pattern,
    (match, prefix: string, quoted: string) =>
      JSON.parse(quoted) === change.from
        ? `${prefix}${JSON.stringify(change.to)}`
        : match
  );

  return `${text.slice(0, start)}${replaced}${text.slice(end)}`;
}

/**
 * Compute and verify every file in memory before writing any of them, so a
 * rejected replacement cannot leave the repository half-renamed.
 */
export function applyIdentityChanges(root: string, changes: IdentityChange[]) {
  const files = [...new Set(changes.map((change) => change.field.file))];
  const rewritten = files.map((file) => {
    const fileChanges = changes.filter((change) => change.field.file === file);
    const text = fileChanges.reduce(
      (current, change) => replaceSingleValue(current, change),
      readFileSync(join(root, file), "utf8")
    );

    for (const change of fileChanges) {
      const applied = readValue(text, change.field);

      if (applied !== change.to) {
        throw new Error(
          `${file}의 ${change.field.label}이(가) "${change.to}"로 적용되지 않았습니다.`
        );
      }
    }

    return { file, text };
  });

  for (const { file, text } of rewritten) {
    writeFileSync(join(root, file), text);
  }
}
