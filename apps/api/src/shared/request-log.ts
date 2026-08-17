/**
 * The only way this server writes a failure down.
 *
 * Name and message, never the error object. An AI SDK call error carries the
 * request it sent as its own property, so printing the object would copy the
 * person's whole conversation into the server log.
 */
export function logRequestFailure(
  method: string,
  path: string,
  error: unknown
): void {
  console.error(
    "Request failed on",
    method,
    path,
    error instanceof Error ? `${error.name}: ${error.message}` : "unknown error"
  );
}

/**
 * An abort is the client hanging up, not a failure, so it goes to the plain
 * log. Method and path only: the abort event carries the finished steps, and
 * printing those would put the person's conversation into the server log.
 */
export function logRequestAbort(method: string, path: string): void {
  console.log("Request aborted on", method, path);
}
