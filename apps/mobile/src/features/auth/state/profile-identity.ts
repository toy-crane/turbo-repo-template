/**
 * What the onboarding screens do with a nickname and an account id before
 * either one reaches the server, and how they describe a rejected value back.
 *
 * The database holds the same rules. These exist so the person finds out while
 * they are still typing rather than after a round trip, not to replace them.
 */

export const NICKNAME_MAX_LENGTH = 30;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

const USERNAME_SHAPE = /^[a-z0-9_]+$/;
const DISALLOWED_IN_USERNAME = /[^a-z0-9_]/g;
const MAIL_TAG = /\+.*$/;

/** How many spellings to offer the server so three free ones survive. */
const CANDIDATE_POOL_SIZE = 10;
const LARGEST_SUFFIX = 99;
/** Every third spelling separates the number, which reads as a choice. */
const SEPARATED_EVERY = 3;

export type NicknameProblem = "empty" | "tooLong";
export type UsernameProblem = "charset" | "tooLong" | "tooShort";

/** Everything that can stand between a typed id and a saved one. */
export type UsernameTrouble =
  | UsernameProblem
  | "checkFailed"
  | "reserved"
  | "taken";

/**
 * Each one says what to do rather than what went wrong, and none of them names
 * a rule the screen is not otherwise showing. There is no message for a
 * well-formed, free id: a green check is the whole answer.
 */
export const USERNAME_MESSAGES: Record<UsernameTrouble, string> = {
  charset: "영문 소문자, 숫자, 밑줄(_)만 사용할 수 있어요.",
  checkFailed: "아이디를 확인하지 못했어요. 다시 시도해 주세요.",
  reserved: "사용할 수 없는 아이디예요.",
  taken: "이미 사용 중인 아이디예요.",
  tooLong: "20자 이하로 입력해 주세요.",
  tooShort: "3자 이상 입력해 주세요.",
};

/**
 * The only nickname message. An empty field disables the button and says
 * nothing: the person has not typed yet, so there is nothing to correct.
 */
export const NICKNAME_TOO_LONG_MESSAGE = "30자 이하로 입력해 주세요.";

/**
 * Counts what a person sees as one letter, near enough.
 *
 * `"가".length` is 1 but `"👩‍👩‍👧".length` is 8, and the spread counts code
 * points rather than UTF-16 units, which is the same unit PostgreSQL `length`
 * uses. A multi-code-point emoji still costs more than one, so the database and
 * this agree even where both disagree with the eye.
 */
function countCharacters(value: string): number {
  return [...value].length;
}

/** Drops the edges and keeps the spaces a person put inside a name. */
export function normalizeNickname(raw: string): string {
  return raw.trim();
}

export function checkNickname(raw: string): NicknameProblem | undefined {
  const value = normalizeNickname(raw);

  if (value.length === 0) {
    return "empty";
  }

  return countCharacters(value) > NICKNAME_MAX_LENGTH ? "tooLong" : undefined;
}

/**
 * Lowercases what was typed or pasted, and changes nothing else.
 *
 * Capitals are the one thing corrected in place: the person meant those
 * letters, and the stored id is lowercase either way. Anything else is left
 * where it is so the field still shows what they typed while the message below
 * says why it cannot be used. Silently deleting characters as someone types
 * makes the field fight them.
 */
export function normalizeUsernameInput(raw: string): string {
  return raw.toLowerCase();
}

/**
 * Charset before length, which is what makes the message the useful one.
 *
 * `민서` is both too short and outside the character set; telling that person
 * to add a third character sends them somewhere that cannot work. `ab` really
 * is only too short.
 */
export function checkUsernameFormat(
  value: string
): UsernameProblem | undefined {
  if (value.length === 0) {
    return;
  }

  if (!USERNAME_SHAPE.test(value)) {
    return "charset";
  }

  if (value.length < USERNAME_MIN_LENGTH) {
    return "tooShort";
  }

  return value.length > USERNAME_MAX_LENGTH ? "tooLong" : undefined;
}

export function isUsernameWellFormed(value: string): boolean {
  return value.length > 0 && checkUsernameFormat(value) === undefined;
}

/**
 * Turns the address someone signed in with into a first account id to edit.
 *
 * Everything here removes rather than invents, so what comes out is recognisably
 * theirs. A result under three characters comes back empty instead: `ab@` would
 * otherwise put a value in the field that the person cannot submit and did not
 * choose.
 */
export function toUsernameCandidate(email: string): string {
  const local = email.split("@")[0] ?? "";
  const candidate = local
    .replace(MAIL_TAG, "")
    .toLowerCase()
    .replace(DISALLOWED_IN_USERNAME, "")
    .slice(0, USERNAME_MAX_LENGTH);

  return candidate.length < USERNAME_MIN_LENGTH ? "" : candidate;
}

/**
 * Spellings of the same id with a number on the end, for when the first one is
 * taken.
 *
 * Only a random number, never a birth year, a join year or anything else about
 * the person: an id is public, and a suggestion built from personal data
 * publishes it. The pool is longer than the three the screen shows because the
 * server still has to confirm each one, and some will be taken too.
 *
 * `random` is a parameter so a test can pin the numbers. The loop is bounded
 * rather than running until the pool fills, because a base with few spellings
 * left would otherwise never finish.
 */
export function buildNumberedCandidates(
  base: string,
  random: () => number = Math.random
): string[] {
  if (base.length === 0) {
    return [];
  }

  const candidates = new Set<string>();

  for (
    let attempt = 0;
    attempt < CANDIDATE_POOL_SIZE * 4 && candidates.size < CANDIDATE_POOL_SIZE;
    attempt += 1
  ) {
    const number = 1 + Math.floor(random() * LARGEST_SUFFIX);
    const suffix = `${attempt % SEPARATED_EVERY === 2 ? "_" : ""}${number}`;
    // The base gives way to the number rather than the other way round, so a
    // 20 character id still produces a suggestion.
    const stem = base.slice(0, USERNAME_MAX_LENGTH - suffix.length);
    const candidate = `${stem}${suffix}`;

    if (stem.length > 0 && candidate.length >= USERNAME_MIN_LENGTH) {
      candidates.add(candidate);
    }
  }

  return [...candidates];
}
