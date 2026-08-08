import {
  applyIdentityChanges,
  IDENTITY_FIELDS,
  type IdentityChange,
  type IdentityValues,
  isConfigured,
  planIdentityChanges,
  readIdentity,
} from "./identity";
import {
  parseSetupArgs,
  type SetupOptions,
  validateDisplayName,
  validateMobileAppId,
  validateProjectSlug,
} from "./options";

export interface SetupIo {
  log: (message: string) => void;
  prompt: (question: string) => Promise<string>;
}

export interface SetupResult {
  changes: IdentityChange[];
  status: "already-configured" | "applied" | "cancelled" | "unchanged";
}

const MAX_PROMPT_ATTEMPTS = 3;
const AFFIRMATIVE_PATTERN = /^(y|yes)$/i;

async function ask(
  io: SetupIo,
  question: string,
  validate: (value: string) => string,
  attempt = 1
): Promise<string> {
  const answer = await io.prompt(question);

  try {
    return validate(answer);
  } catch (error) {
    if (attempt >= MAX_PROMPT_ATTEMPTS) {
      throw error;
    }

    io.log(`  ${(error as Error).message}`);

    return ask(io, question, validate, attempt + 1);
  }
}

async function collectValues(
  options: SetupOptions,
  io: SetupIo
): Promise<IdentityValues> {
  const projectSlug = options.projectSlug
    ? validateProjectSlug(options.projectSlug)
    : await ask(
        io,
        "1/3 project slug (소문자 kebab-case, 예: aurora-notes): ",
        validateProjectSlug
      );
  const displayName = options.displayName
    ? validateDisplayName(options.displayName)
    : await ask(
        io,
        "2/3 앱 표시 이름 (예: Aurora Notes): ",
        validateDisplayName
      );
  const mobileAppId = options.mobileAppId
    ? validateMobileAppId(options.mobileAppId)
    : await ask(
        io,
        "3/3 모바일 앱 식별자 (reverse-DNS, 예: com.aurora.notes): ",
        validateMobileAppId
      );

  return { displayName, mobileAppId, projectSlug };
}

function isAffirmative(answer: string): boolean {
  return AFFIRMATIVE_PATTERN.test(answer.trim());
}

export async function runSetup({
  argv,
  io,
  root,
}: {
  argv: string[];
  io: SetupIo;
  root: string;
}): Promise<SetupResult> {
  const options = parseSetupArgs(argv);
  const current = readIdentity(root);

  if (isConfigured(current) && !options.force) {
    io.log("이 저장소의 프로젝트 식별자는 이미 설정되어 있습니다.");

    for (const field of IDENTITY_FIELDS) {
      io.log(`  ${field.file}  ${field.label}: ${current.get(field)}`);
    }

    io.log("다시 적용하려면 --force와 함께 실행하세요. 변경 없이 종료합니다.");

    return { changes: [], status: "already-configured" };
  }

  const values = await collectValues(options, io);
  const changes = planIdentityChanges(current, values);

  if (changes.length === 0) {
    io.log("이미 입력한 값과 같습니다. 변경 없이 종료합니다.");

    return { changes: [], status: "unchanged" };
  }

  io.log("다음 필드를 변경합니다.");

  for (const change of changes) {
    io.log(
      `  ${change.field.file}  ${change.field.label}: ${change.from} → ${change.to}`
    );
  }

  if (!options.yes) {
    const answer = await io.prompt("이대로 적용할까요? (y/N): ");

    if (!isAffirmative(answer)) {
      io.log("변경 없이 종료합니다.");

      return { changes: [], status: "cancelled" };
    }
  }

  applyIdentityChanges(root, changes);
  io.log("프로젝트 식별자를 적용했습니다.");
  io.log(
    "Supabase local database 이름(postgres)과 env 파일은 변경하지 않았습니다."
  );

  return { changes, status: "applied" };
}
