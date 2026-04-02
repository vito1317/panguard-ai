/**
 * Result type for operations that can fail.
 * Use instead of throwing for expected failures.
 * Provides a functional alternative to exceptions for error handling.
 */

export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * Wrap a successful value in a Result.
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Wrap a failure error in a Result.
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Type guard to check if a Result is a success.
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

/**
 * Type guard to check if a Result is a failure.
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}

/**
 * Unwrap a Result, throwing the error if it represents a failure.
 * Useful for converting Result back to exception-based error handling.
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error instanceof Error ? result.error : new Error(String(result.error));
}

/**
 * Transform the success value if present, leaving errors unchanged.
 */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (result.ok) return ok(fn(result.value));
  return result;
}

/**
 * Transform the error if present, leaving success values unchanged.
 */
export function mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (result.ok) return result;
  return err(fn(result.error));
}

/**
 * Chain multiple Result operations together (monadic bind).
 * If the first Result is an error, it's returned immediately.
 */
export function flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
  if (!result.ok) return result;
  return fn(result.value);
}

/**
 * Async version of tryCatch: wraps a Promise-returning function.
 * Catches both thrown errors and Promise rejections.
 */
export async function tryCatch<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    return err(error);
  }
}

/**
 * Get the value or a default if it's an error.
 */
export function getOrElse<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (result.ok) return result.value;
  return defaultValue;
}

/**
 * Get the value or undefined if it's an error.
 */
export function toOption<T, E>(result: Result<T, E>): T | undefined {
  if (result.ok) return result.value;
  return undefined;
}
