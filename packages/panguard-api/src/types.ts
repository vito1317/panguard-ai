/**
 * @panguard-ai/panguard-api - REST API type definitions
 *
 * Public API types for skill scanning webhooks and third-party integrations.
 */

import type { Finding, CheckResult, RiskLevel } from '@panguard-ai/scan-core';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * API server configuration
 */
export interface ApiConfig {
  readonly port: number;
  readonly host: string;
  readonly apiKeys: readonly string[];
  readonly rateLimit: {
    readonly requestsPerMinute: number;
  };
  readonly corsOrigins: readonly string[];
  readonly requestBodyLimit: number;
}

// ---------------------------------------------------------------------------
// Request/Response Types
// ---------------------------------------------------------------------------

/**
 * Single skill scan request
 */
export interface ScanRequest {
  readonly content?: string;
  readonly url?: string;
  readonly sourceType?: 'skill' | 'documentation';
  readonly skillName?: string;
}

/**
 * Single skill scan response
 */
export interface ScanResponse {
  readonly success: boolean;
  readonly data?: {
    readonly skillName: string | null;
    readonly riskLevel: RiskLevel;
    readonly riskScore: number;
    readonly findings: readonly Finding[];
    readonly checks: readonly CheckResult[];
    readonly durationMs: number;
  };
  readonly error?: string;
}

/**
 * Health check response
 */
export interface HealthResponse {
  readonly status: 'healthy' | 'unhealthy';
  readonly version: string;
  readonly uptime: number;
  readonly scansProcessed: number;
}

/**
 * Batch scan request (multiple skills)
 */
export interface BatchScanRequest {
  readonly skills: readonly ScanRequest[];
}

/**
 * Batch scan response
 */
export interface BatchScanResponse {
  readonly success: boolean;
  readonly results: readonly ScanResponse[];
  readonly totalDurationMs: number;
}

/**
 * Webhook registration request
 */
export interface WebhookRequest {
  readonly url: string;
  readonly events: readonly ('scan.completed' | 'scan.failed')[];
  readonly secret?: string;
}

/**
 * Webhook registration response
 */
export interface WebhookResponse {
  readonly id: string;
  readonly url: string;
  readonly events: readonly string[];
  readonly createdAt: string;
  readonly active: boolean;
}

/**
 * Available ATR rules response
 */
export interface RulesResponse {
  readonly rules: readonly {
    readonly id: string;
    readonly title: string;
    readonly severity: string;
    readonly category: string;
  }[];
  readonly totalCount: number;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/**
 * Rate limit state per API key
 */
export interface RateLimitState {
  readonly requests: readonly number[];
  readonly blocked?: boolean;
}

/**
 * Registered webhook
 */
export interface RegisteredWebhook {
  readonly id: string;
  readonly url: string;
  readonly events: readonly string[];
  readonly secret: string | null;
  readonly createdAt: Date;
  readonly active: boolean;
}

/**
 * Server statistics
 */
export interface ServerStats {
  readonly uptime: number;
  readonly scansProcessed: number;
  readonly webhooksRegistered: number;
  readonly activeRateLimits: number;
}
