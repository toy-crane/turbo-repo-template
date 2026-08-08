export interface SetupOptions {
  displayName: string | undefined;
  force: boolean;
  mobileAppId: string | undefined;
  projectSlug: string | undefined;
  yes: boolean;
}

const VALUE_FLAGS = {
  "--display-name": "displayName",
  "--mobile-app-id": "mobileAppId",
  "--project-slug": "projectSlug",
} as const;

// A slug becomes the Expo `scheme`, and RFC 3986 requires a URI scheme to start
// with a letter — a leading digit produces deep links no platform can parse.
const PROJECT_SLUG_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
// The one identifier feeds both iOS and Android, so it must satisfy the
// intersection: no `-` (illegal in an Android package) and no `_` (outside
// Apple's CFBundleIdentifier character set).
const MOBILE_APP_ID_PATTERN =
  /^[a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)+$/;
const CONTROL_CHARACTER_PATTERN = /[\p{Cc}]/u;

// Android package segments compile to Java/Kotlin package names, so a reserved
// word makes prebuild emit source that the compiler rejects.
const RESERVED_APP_ID_SEGMENTS = new Set([
  "abstract",
  "assert",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extends",
  "false",
  "final",
  "finally",
  "float",
  "for",
  "goto",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "int",
  "interface",
  "is",
  "long",
  "native",
  "new",
  "null",
  "object",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "strictfp",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "true",
  "try",
  "typealias",
  "typeof",
  "val",
  "var",
  "void",
  "volatile",
  "when",
  "while",
]);

export function parseSetupArgs(argv: string[]): SetupOptions {
  const options: SetupOptions = {
    displayName: undefined,
    force: false,
    mobileAppId: undefined,
    projectSlug: undefined,
    yes: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] ?? "";

    if (argument === "--yes" || argument === "-y") {
      options.yes = true;
      continue;
    }

    if (argument === "--force") {
      options.force = true;
      continue;
    }

    const [flag, inlineValue] = argument.includes("=")
      ? [
          argument.slice(0, argument.indexOf("=")),
          argument.slice(argument.indexOf("=") + 1),
        ]
      : [argument, undefined];
    // `Object.hasOwn` rather than a plain lookup: a bare index would resolve
    // `toString`, `constructor` and friends through the prototype chain and
    // wave them past this guard.
    const key = Object.hasOwn(VALUE_FLAGS, flag)
      ? VALUE_FLAGS[flag as keyof typeof VALUE_FLAGS]
      : undefined;

    if (!key) {
      throw new Error(
        `알 수 없는 옵션입니다: ${argument}. 사용 가능한 옵션: --project-slug, --display-name, --mobile-app-id, --yes, --force.`
      );
    }

    const value = inlineValue ?? argv[index + 1];

    // Reject any `-` prefix, not just `--`: a following short flag such as `-y`
    // would otherwise be swallowed as this option's value.
    if (!value || value.startsWith("-")) {
      throw new Error(`${flag} 옵션에는 값이 필요합니다.`);
    }

    if (inlineValue === undefined) {
      index += 1;
    }

    options[key] = value;
  }

  return options;
}

export function validateProjectSlug(value: string): string {
  const slug = value.trim();

  if (!PROJECT_SLUG_PATTERN.test(slug)) {
    throw new Error(
      `project slug는 소문자 kebab-case여야 합니다 (예: aurora-notes). 받은 값: "${value}".`
    );
  }

  return slug;
}

export function validateDisplayName(value: string): string {
  const name = value.trim();

  if (!name || CONTROL_CHARACTER_PATTERN.test(name)) {
    throw new Error(
      `앱 표시 이름은 비어 있지 않은 한 줄 문자열이어야 합니다. 받은 값: "${value}".`
    );
  }

  return name;
}

export function validateMobileAppId(value: string): string {
  const appId = value.trim();

  if (!MOBILE_APP_ID_PATTERN.test(appId)) {
    throw new Error(
      `모바일 앱 식별자는 완성된 reverse-DNS 형식이어야 합니다 (예: com.aurora.notes). iOS와 Android가 같은 값을 쓰므로 하이픈과 밑줄은 사용할 수 없습니다. 받은 값: "${value}".`
    );
  }

  const reserved = appId
    .split(".")
    .find((segment) => RESERVED_APP_ID_SEGMENTS.has(segment.toLowerCase()));

  if (reserved) {
    throw new Error(
      `모바일 앱 식별자에 예약어 "${reserved}"를 쓸 수 없습니다. Android package가 Java·Kotlin 예약어를 거부합니다. 받은 값: "${value}".`
    );
  }

  return appId;
}
