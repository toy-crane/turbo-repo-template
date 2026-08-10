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
