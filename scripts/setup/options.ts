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

const PROJECT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MOBILE_APP_ID_PATTERN =
  /^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
const CONTROL_CHARACTER_PATTERN = /[\p{Cc}]/u;

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
    const key = VALUE_FLAGS[flag as keyof typeof VALUE_FLAGS];

    if (!key) {
      throw new Error(
        `알 수 없는 옵션입니다: ${argument}. 사용 가능한 옵션: --project-slug, --display-name, --mobile-app-id, --yes, --force.`
      );
    }

    const value = inlineValue ?? argv[index + 1];

    if (!value || value.startsWith("--")) {
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
      `모바일 앱 식별자는 완성된 reverse-DNS 형식이어야 합니다 (예: com.aurora.notes). 하이픈은 Android package에서 사용할 수 없습니다. 받은 값: "${value}".`
    );
  }

  return appId;
}
