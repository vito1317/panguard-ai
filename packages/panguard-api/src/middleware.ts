/**
 * HTTP middleware for authentication, rate limiting, CORS, and body parsing
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import type { RateLimitState } from './types.js';

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/**
 * Extract and validate API key from request
 * / 從請求中提取並驗證 API 密鑰
 */
export function authenticate(
  req: IncomingMessage,
  validApiKeys: readonly string[]
): { valid: boolean; key: string | null } {
  // Check header first
  const headerKey = req.headers['x-api-key'];
  if (headerKey && typeof headerKey === 'string') {
    if (validApiKeys.includes(headerKey)) {
      return { valid: true, key: headerKey };
    }
  }

  // Check query parameter
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const queryKey = url.searchParams.get('api_key');
  if (queryKey && validApiKeys.includes(queryKey)) {
    return { valid: true, key: queryKey };
  }

  return { valid: false, key: null };
}

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

/**
 * In-memory rate limiter using request timestamps
 * / 使用請求時間戳的記憶體內速率限制器
 */
export class RateLimiter {
  private readonly limits: Map<string, RateLimitState> = new Map();
  readonly requestsPerMinute: number;

  constructor(requestsPerMinute: number) {
    this.requestsPerMinute = requestsPerMinute;
  }

  /**
   * Check if key has exceeded rate limit
   */
  isLimited(key: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    let state = this.limits.get(key);

    if (!state) {
      state = { requests: [] };
      this.limits.set(key, state);
    }

    // Remove old requests outside the 1-minute window
    const filtered = (state.requests as number[]).filter((t) => t > oneMinuteAgo);

    if (filtered.length >= this.requestsPerMinute) {
      return true;
    }

    // Add current request
    (filtered as number[]).push(now);
    this.limits.set(key, { requests: filtered });

    return false;
  }

  /**
   * Get remaining requests for key within current minute
   */
  getRemaining(key: string): number {
    const state = this.limits.get(key);
    if (!state) return this.requestsPerMinute;

    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    const recent = (state.requests as number[]).filter((t) => t > oneMinuteAgo).length;
    return Math.max(0, this.requestsPerMinute - recent);
  }

  /**
   * Clear rate limit data for key
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Get statistics for rate limiter
   */
  getStats(): { readonly totalKeys: number } {
    return { totalKeys: this.limits.size };
  }
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

/**
 * Set CORS headers on response
 * / 在響應上設置 CORS 標頭
 */
export function setCorsHeaders(
  res: ServerResponse,
  origin: string | undefined,
  allowedOrigins: readonly string[]
): void {
  // Check if origin is allowed
  let allowed = false;
  if (allowedOrigins.includes('*')) {
    allowed = true;
  } else if (origin && allowedOrigins.includes(origin)) {
    allowed = true;
  }

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-API-Key');
    res.setHeader('Access-Control-Max-Age', '3600');
  }
}

// ---------------------------------------------------------------------------
// Body Parsing
// ---------------------------------------------------------------------------

/**
 * Parse JSON body from request with size limit
 * / 從請求解析 JSON 主體並設定大小限制
 */
export async function parseJsonBody(
  req: IncomingMessage,
  maxSize: number
): Promise<{ valid: true; data: unknown } | { valid: false; error: string }> {
  return new Promise((resolve) => {
    let body = '';
    const contentType = req.headers['content-type'];

    // Check content type
    if (!contentType || !contentType.includes('application/json')) {
      resolve({ valid: false, error: 'Content-Type must be application/json' });
      return;
    }

    req.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf-8');

      // Check size limit
      if (body.length > maxSize) {
        req.destroy();
        resolve({ valid: false, error: `Request body exceeds ${maxSize} bytes` });
      }
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(body) as unknown;
        resolve({ valid: true, data: parsed });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        resolve({ valid: false, error: `Invalid JSON: ${message}` });
      }
    });

    req.on('error', (err) => {
      const message = err instanceof Error ? err.message : String(err);
      resolve({ valid: false, error: `Request error: ${message}` });
    });
  });
}

// ---------------------------------------------------------------------------
// Request ID
// ---------------------------------------------------------------------------

/**
 * Generate a unique request ID
 * / 產生唯一的請求 ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
