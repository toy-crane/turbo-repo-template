/**
 * Reading the account id lock the server stamped.
 *
 * The instant is decided by the database and arrives on the profile. Nothing
 * here recomputes it from a period or a change date: a device with a wrong clock
 * would then disagree with the server about a rule the server enforces anyway.
 */

/** Whether the account id may still be changed right now. */
export function isUsernameLockActive(
  lockedUntil: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!lockedUntil) {
    return false;
  }

  const unlockAt = new Date(lockedUntil).getTime();

  // An unparseable value would otherwise compare as NaN and read as unlocked,
  // which turns a bad timestamp into an editable field and a failed save.
  return Number.isNaN(unlockAt) ? false : unlockAt > now.getTime();
}

/**
 * The unlock instant as the day the person will see it.
 *
 * Their own date, not the server's: a lock ending at 09:00 UTC is a different
 * calendar day either side of the date line, and the one that matters is the one
 * on the calendar they are looking at. The parts come from the local Date
 * getters, which is what makes that true without naming a timezone.
 */
export function formatUsernameUnlockDate(lockedUntil: string): string {
  const unlockAt = new Date(lockedUntil);

  if (Number.isNaN(unlockAt.getTime())) {
    return "";
  }

  const year = unlockAt.getFullYear();
  const month = unlockAt.getMonth() + 1;
  const day = unlockAt.getDate();

  return `${year}년 ${month}월 ${day}일`;
}
