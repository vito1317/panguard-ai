/**
 * @panguard-ai/panguard-api - REST API for PanGuard skill scanning
 *
 * Public exports for the skill scanning REST API server.
 * Provides webhooks and third-party integration support.
 */

import { createRequire } from 'node:module';

// Get version from package.json
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json') as { version: string };

// ---------------------------------------------------------------------------
// Main Exports
// ---------------------------------------------------------------------------

export { PanguardApiServer } from './server.js';
export { RateLimiter } from './middleware.js';

// Types
export type {
  ApiConfig,
  ScanRequest,
  ScanResponse,
  HealthResponse,
  BatchScanRequest,
  BatchScanResponse,
  WebhookRequest,
  WebhookResponse,
  RulesResponse,
  RateLimitState,
  RegisteredWebhook,
  ServerStats,
} from './types.js';

// Validation
export {
  scanRequestSchema,
  batchScanRequestSchema,
  webhookRequestSchema,
  apiKeySchema,
  validateScanRequest,
  validateBatchScanRequest,
  validateWebhookRequest,
  validateApiKey,
} from './validation.js';

// Middleware
export {
  authenticate,
  setCorsHeaders,
  parseJsonBody,
  generateRequestId,
} from './middleware.js';

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

/**
 * Get the version of this package
 * / 取得此套件的版本
 */
export function getVersion(): string {
  return packageJson.version;
}
