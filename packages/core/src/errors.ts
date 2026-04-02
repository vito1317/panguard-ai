/**
 * Shared error types for all Panguard packages.
 * Provides structured errors with error codes for better debugging.
 */

export type ErrorCode =
  | 'SCAN_FAILED'
  | 'SCAN_TIMEOUT'
  | 'INVALID_INPUT'
  | 'INVALID_MANIFEST'
  | 'ATR_COMPILE_FAILED'
  | 'ATR_LOAD_FAILED'
  | 'GUARD_START_FAILED'
  | 'GUARD_STOP_FAILED'
  | 'AUTH_FAILED'
  | 'AUTH_EXPIRED'
  | 'RATE_LIMITED'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'FILESYSTEM_ERROR'
  | 'PATH_TRAVERSAL'
  | 'CONFIG_INVALID'
  | 'WEBHOOK_FAILED'
  | 'MCP_ERROR'
  | 'UNKNOWN';

/**
 * Base error class for all Panguard errors.
 * Includes structured error code and optional details.
 */
export class PanguardError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode = 'UNKNOWN',
    options?: { statusCode?: number; details?: Record<string, unknown>; cause?: Error }
  ) {
    super(message, { cause: options?.cause });
    this.name = 'PanguardError';
    this.code = code;
    this.statusCode = options?.statusCode ?? errorCodeToStatus(code);
    this.details = options?.details;
  }

  /**
   * Serialize to JSON for logging or API responses.
   */
  toJSON(): Record<string, unknown> {
    return {
      error: this.message,
      code: this.code,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

/**
 * Scan-related error (parsing, content validation, etc.)
 */
export class ScanError extends PanguardError {
  constructor(
    message: string,
    code: ErrorCode = 'SCAN_FAILED',
    options?: { statusCode?: number; details?: Record<string, unknown>; cause?: Error }
  ) {
    super(message, code, options);
    this.name = 'ScanError';
  }
}

/**
 * Input validation error (invalid parameters, malformed data, etc.)
 */
export class ValidationError extends PanguardError {
  constructor(
    message: string,
    code: ErrorCode = 'INVALID_INPUT',
    options?: { statusCode?: number; details?: Record<string, unknown>; cause?: Error }
  ) {
    super(message, code, { ...options, statusCode: options?.statusCode ?? 400 });
    this.name = 'ValidationError';
  }
}

/**
 * Authentication or authorization error.
 */
export class AuthError extends PanguardError {
  constructor(
    message: string,
    code: ErrorCode = 'AUTH_FAILED',
    options?: { statusCode?: number; details?: Record<string, unknown>; cause?: Error }
  ) {
    super(message, code, { ...options, statusCode: options?.statusCode ?? 401 });
    this.name = 'AuthError';
  }
}

/**
 * Rate limit error.
 */
export class RateLimitError extends PanguardError {
  constructor(
    message: string,
    code: ErrorCode = 'RATE_LIMITED',
    options?: { statusCode?: number; details?: Record<string, unknown>; cause?: Error }
  ) {
    super(message, code, { ...options, statusCode: options?.statusCode ?? 429 });
    this.name = 'RateLimitError';
  }
}

/**
 * Configuration error (invalid config file, missing required fields, etc.)
 */
export class ConfigError extends PanguardError {
  constructor(
    message: string,
    code: ErrorCode = 'CONFIG_INVALID',
    options?: { statusCode?: number; details?: Record<string, unknown>; cause?: Error }
  ) {
    super(message, code, { ...options, statusCode: options?.statusCode ?? 400 });
    this.name = 'ConfigError';
  }
}

/**
 * Map error code to HTTP status code.
 */
function errorCodeToStatus(code: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
    SCAN_FAILED: 400,
    SCAN_TIMEOUT: 504,
    INVALID_INPUT: 400,
    INVALID_MANIFEST: 400,
    ATR_COMPILE_FAILED: 400,
    ATR_LOAD_FAILED: 500,
    GUARD_START_FAILED: 500,
    GUARD_STOP_FAILED: 500,
    AUTH_FAILED: 401,
    AUTH_EXPIRED: 401,
    RATE_LIMITED: 429,
    API_ERROR: 500,
    NETWORK_ERROR: 503,
    FILESYSTEM_ERROR: 500,
    PATH_TRAVERSAL: 400,
    CONFIG_INVALID: 400,
    WEBHOOK_FAILED: 500,
    MCP_ERROR: 500,
    UNKNOWN: 500,
  };
  return statusMap[code] ?? 500;
}

/**
 * Type guard to check if an error is a PanguardError.
 */
export function isPanguardError(err: unknown): err is PanguardError {
  return err instanceof PanguardError;
}

/**
 * Safely extract error message from unknown error type.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}
