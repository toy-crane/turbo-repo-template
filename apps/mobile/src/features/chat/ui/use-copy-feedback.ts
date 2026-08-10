import { setStringAsync } from "expo-clipboard";
import { useCallback, useEffect, useRef, useState } from "react";

/** How long "복사됨" stays on screen, in milliseconds. */
const COPIED_FEEDBACK_MS = 2000;

/**
 * Copying to the clipboard and the short confirmation that follows.
 *
 * Both the message row and the code block need this, and both live inside a
 * virtual list that can drop them at any moment. The clipboard call is
 * asynchronous, so a row torn down mid-write would otherwise come back to set
 * state on a component that is gone and leave a timer nobody clears. Each
 * mount gets a number, and a write only reports back while its own number is
 * still the current one.
 */
export function useCopyFeedback(text: () => string) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const mount = useRef(0);
  const readText = useRef(text);

  readText.current = text;

  useEffect(
    () => () => {
      mount.current += 1;

      if (resetTimer.current !== undefined) {
        clearTimeout(resetTimer.current);
      }
    },
    []
  );

  const copy = useCallback(() => {
    const startedOn = mount.current;

    setStringAsync(readText.current())
      .then(() => {
        if (startedOn !== mount.current) {
          return;
        }

        setCopied(true);

        if (resetTimer.current !== undefined) {
          clearTimeout(resetTimer.current);
        }

        resetTimer.current = setTimeout(() => {
          setCopied(false);
        }, COPIED_FEEDBACK_MS);
      })
      .catch(() => undefined);
  }, []);

  return { copied, copy };
}
