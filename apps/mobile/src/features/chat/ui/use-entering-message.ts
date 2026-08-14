import type { UIMessage } from "ai";
import { useCallback, useRef, useState } from "react";

/**
 * Which question came from the send that just happened.
 *
 * Only that one message comes in from below. A conversation shown for the first
 * time, a row the list rebuilds while scrolling, and an answer being asked for
 * again all arrive in place, so the movement means one thing: what the person
 * just sent.
 *
 * The panel says when a send starts, and the messages already in the
 * conversation at that moment are written down. The question is then whichever
 * message is not among them, which is an answer this can give in the same
 * render that puts the new row on screen — an effect would run after that row
 * had already appeared, too late for it to come in from anywhere.
 *
 * Sending from the edit state shortens the conversation before it grows again,
 * so the names are compared rather than counted.
 */
export function useEnteringMessage(messages: UIMessage[]) {
  const [messagesBeforeSend, setMessagesBeforeSend] = useState<Set<string>>();
  const currentMessages = useRef(messages);

  currentMessages.current = messages;

  const markSent = useCallback(() => {
    setMessagesBeforeSend(
      new Set(currentMessages.current.map((message) => message.id))
    );
  }, []);
  // Once the row has come in, the send is over: nothing moves again until the
  // next one, and rebuilding that row leaves it where it is.
  const markEntered = useCallback(() => setMessagesBeforeSend(undefined), []);
  const enteringMessageId = messagesBeforeSend
    ? messages.findLast(
        (message) =>
          message.role === "user" && !messagesBeforeSend.has(message.id)
      )?.id
    : undefined;

  return { enteringMessageId, markEntered, markSent };
}
