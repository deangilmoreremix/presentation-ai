/**
 * Executes an async function with a timeout.
 * Throws a timeout error if the function doesn't complete within the specified time.
 */

export class TimeoutError extends Error {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message);
    this.name = "TimeoutError";
  }
}

export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  label = "operation",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new TimeoutError(
          `${label} timed out after ${timeoutMs}ms`,
          timeoutMs,
        ),
      );
    }, timeoutMs);

    fn()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
