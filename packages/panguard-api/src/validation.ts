/**
 * Request validation schemas using Zod
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_CONTENT_SIZE = 1_000_000; // 1MB
const MAX_URL_LENGTH = 2048;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/**
 * Validate a single scan request
 */
export const scanRequestSchema = z.object({
  content: z.string().max(MAX_CONTENT_SIZE).optional(),
  url: z.string().url().max(MAX_URL_LENGTH).optional(),
  sourceType: z.enum(['skill', 'documentation']).optional(),
  skillName: z.string().max(256).optional(),
}).refine(
  (data) => data.content || data.url,
  { message: 'Either content or url must be provided' }
);

/**
 * Validate batch scan request
 */
export const batchScanRequestSchema = z.object({
  skills: z.array(scanRequestSchema).min(1).max(100),
});

/**
 * Validate webhook registration request
 */
export const webhookRequestSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(['scan.completed', 'scan.failed'])).min(1),
  secret: z.string().optional(),
});

/**
 * Validate API key format
 */
export const apiKeySchema = z.string().regex(/^[a-zA-Z0-9_-]{32,}$/, {
  message: 'Invalid API key format',
});

/**
 * Type exports for validated data
 */
export type ValidatedScanRequest = z.infer<typeof scanRequestSchema>;
export type ValidatedBatchScanRequest = z.infer<typeof batchScanRequestSchema>;
export type ValidatedWebhookRequest = z.infer<typeof webhookRequestSchema>;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validate and parse a scan request
 * / 驗證並解析掃描請求
 */
export function validateScanRequest(data: unknown): { valid: true; data: ValidatedScanRequest } | { valid: false; error: string } {
  const result = scanRequestSchema.safeParse(data);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
  return { valid: false, error: messages };
}

/**
 * Validate and parse a batch scan request
 * / 驗證並解析批次掃描請求
 */
export function validateBatchScanRequest(data: unknown): { valid: true; data: ValidatedBatchScanRequest } | { valid: false; error: string } {
  const result = batchScanRequestSchema.safeParse(data);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
  return { valid: false, error: messages };
}

/**
 * Validate and parse a webhook registration request
 * / 驗證並解析 Webhook 註冊請求
 */
export function validateWebhookRequest(data: unknown): { valid: true; data: ValidatedWebhookRequest } | { valid: false; error: string } {
  const result = webhookRequestSchema.safeParse(data);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
  return { valid: false, error: messages };
}

/**
 * Validate an API key
 * / 驗證 API 密鑰
 */
export function validateApiKey(key: string): boolean {
  return apiKeySchema.safeParse(key).success;
}
