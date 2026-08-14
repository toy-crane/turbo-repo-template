import { useEffect, useState } from "react";

/**
 * How long an answer may take before its place says anything. Under this, the
 * first characters are about to land and a line announcing the wait would be
 * gone before it could be read.
 */
const LATE_AFTER_MS = 300;

/**
 * Whether the wait has lasted long enough to report.
 *
 * The caller says whether an answer is still on its way; this says whether that
 * has been true long enough to show something for it. A wait that ends first
 * never turns this on, and a wait that ends later turns it back off.
 */
export function useLateAnswer(isWaiting: boolean): boolean {
  const [isLate, setIsLate] = useState(false);

  useEffect(() => {
    if (!isWaiting) {
      setIsLate(false);

      return;
    }

    const timer = setTimeout(() => setIsLate(true), LATE_AFTER_MS);

    return () => clearTimeout(timer);
  }, [isWaiting]);

  return isWaiting && isLate;
}
