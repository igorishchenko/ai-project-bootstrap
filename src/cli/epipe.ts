/**
 * A closed pipe is ordinary shell behavior, not a crash.
 *
 * `ai-project-bootstrap --list-modules | head -3` leaves us writing into a pipe
 * nobody is reading any more. The socket then emits an 'error' event with code
 * EPIPE, and with no listener attached Node turns that into an unhandled error
 * and prints a full stack trace over what the person at the terminal considers
 * a perfectly normal thing to have typed.
 */

/** True for "the reader closed the pipe", whether it was thrown or emitted. */
export function isEpipe(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as NodeJS.ErrnoException).code === 'EPIPE'
  );
}

/**
 * Makes `stream` exit quietly instead of crashing when its reader goes away.
 *
 * Exiting 0 mirrors what happens on the other side of the pipe: the output was
 * truncated because the reader chose to stop, which is not a failure of this
 * process. Every other stream error is rethrown, so it still crashes exactly as
 * loudly as it did before.
 *
 * A no-op for anything that isn't an event emitter — `Reporter` takes an
 * injectable stream, and tests pass a bare `{ write() {} }` object.
 */
export function ignoreEpipe(
  stream: NodeJS.WritableStream,
  onEpipe: () => void = () => process.exit(0),
): void {
  const on = (stream as Partial<NodeJS.WritableStream> | undefined)?.on;
  if (typeof on !== 'function') return;

  stream.on('error', (error: unknown) => {
    if (!isEpipe(error)) throw error;
    onEpipe();
  });
}
