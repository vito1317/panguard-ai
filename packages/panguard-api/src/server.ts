/**
 * PanguardApiServer - Core HTTP server for REST API
 *
 * Provides endpoints for skill scanning, webhooks, and health checks.
 * Uses Node.js built-in http module (no Express dependency).
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { scanContent, compileRules } from '@panguard-ai/scan-core';
import { loadRulesFromDirectory } from '@panguard-ai/atr';
import type { ApiConfig, ScanResponse, HealthResponse, BatchScanResponse, RulesResponse, ServerStats, RegisteredWebhook } from './types.js';
import { authenticate, RateLimiter, setCorsHeaders, parseJsonBody, generateRequestId } from './middleware.js';
import { validateScanRequest, validateBatchScanRequest, validateWebhookRequest } from './validation.js';

// ---------------------------------------------------------------------------
// Server Implementation
// ---------------------------------------------------------------------------

/**
 * PanguardApiServer - Main HTTP server for skill scanning API
 * / PanguardApiServer - 技能掃描 API 的主要 HTTP 伺服器
 */
export class PanguardApiServer {
  private readonly config: ApiConfig;
  private readonly rateLimiter: RateLimiter;
  private readonly webhooks: Map<string, RegisteredWebhook> = new Map();
  private readonly startTime: number = Date.now();
  private scansProcessed: number = 0;
  private server: ReturnType<typeof createServer> | null = null;

  constructor(config: ApiConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter(config.rateLimit.requestsPerMinute);
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res).catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Request error: ${message}`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
        });
      });

      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`PanguardApi listening on ${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.server.on('error', (err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Server error: ${message}`);
      });
    });
  }

  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close(() => {
        console.log('Server stopped');
        resolve();
      });
    });
  }

  /**
   * Get server statistics
   */
  getStats(): ServerStats {
    return {
      uptime: Date.now() - this.startTime,
      scansProcessed: this.scansProcessed,
      webhooksRegistered: this.webhooks.size,
      activeRateLimits: this.rateLimiter.getStats().totalKeys,
    };
  }

  /**
   * Main request router
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const requestId = generateRequestId();
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const pathname = url.pathname;
    const method = req.method ?? 'GET';

    // Set CORS headers
    const origin = req.headers.origin as string | undefined;
    setCorsHeaders(res, origin, this.config.corsOrigins);

    // Handle OPTIONS
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);

    // Route requests
    if (pathname === '/api/v1/health') {
      this.handleHealth(res);
    } else if (pathname === '/api/v1/scan' && method === 'POST') {
      await this.handleScan(req, res);
    } else if (pathname === '/api/v1/scan/batch' && method === 'POST') {
      await this.handleBatchScan(req, res);
    } else if (pathname === '/api/v1/rules' && method === 'GET') {
      this.handleRules(res);
    } else if (pathname === '/api/v1/webhook' && method === 'POST') {
      await this.handleWebhookRegister(req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Not found' }));
    }
  }

  /**
   * Handle GET /api/v1/health
   */
  private handleHealth(res: ServerResponse): void {
    const response: HealthResponse = {
      status: 'healthy',
      version: '0.1.0',
      uptime: Date.now() - this.startTime,
      scansProcessed: this.scansProcessed,
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  /**
   * Handle POST /api/v1/scan
   */
  private async handleScan(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Check authentication
    const auth = authenticate(req, this.config.apiKeys);
    if (!auth.valid) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
      return;
    }

    // Check rate limit
    const key = auth.key!;
    if (this.rateLimiter.isLimited(key)) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '0' });
      res.end(JSON.stringify({ success: false, error: 'Rate limit exceeded' }));
      return;
    }

    // Parse body
    const body = await parseJsonBody(req, this.config.requestBodyLimit);
    if (!body.valid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: body.error }));
      return;
    }

    // Validate request
    const validation = validateScanRequest(body.data);
    if (!validation.valid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: validation.error }));
      return;
    }

    // Perform scan
    const startTime = Date.now();
    let content = validation.data.content || '';

    // Fetch from URL if provided
    if (validation.data.url && !validation.data.content) {
      try {
        const urlResponse = await fetch(validation.data.url);
        content = await urlResponse.text();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: `Failed to fetch URL: ${message}` }));
        return;
      }
    }

    // Scan content
    const result = scanContent(content, {
      sourceType: validation.data.sourceType,
      skillName: validation.data.skillName,
    });

    this.scansProcessed++;
    const remaining = this.rateLimiter.getRemaining(key);

    const response: ScanResponse = {
      success: true,
      data: {
        skillName: result.skillName,
        riskLevel: result.riskLevel,
        riskScore: result.riskScore,
        findings: result.findings,
        checks: result.checks,
        durationMs: Date.now() - startTime,
      },
    };

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': String(remaining),
    });
    res.end(JSON.stringify(response));

    // Trigger webhooks
    this.triggerWebhooks('scan.completed', response);
  }

  /**
   * Handle POST /api/v1/scan/batch
   */
  private async handleBatchScan(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Check authentication
    const auth = authenticate(req, this.config.apiKeys);
    if (!auth.valid) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
      return;
    }

    // Check rate limit
    const key = auth.key!;
    if (this.rateLimiter.isLimited(key)) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '0' });
      res.end(JSON.stringify({ success: false, error: 'Rate limit exceeded' }));
      return;
    }

    // Parse body
    const body = await parseJsonBody(req, this.config.requestBodyLimit);
    if (!body.valid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: body.error }));
      return;
    }

    // Validate request
    const validation = validateBatchScanRequest(body.data);
    if (!validation.valid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: validation.error }));
      return;
    }

    // Scan all skills
    const startTime = Date.now();
    const results: ScanResponse[] = [];

    for (const request of validation.data.skills) {
      let content = request.content || '';

      // Fetch from URL if provided
      if (request.url && !request.content) {
        try {
          const urlResponse = await fetch(request.url);
          content = await urlResponse.text();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          results.push({
            success: false,
            error: `Failed to fetch URL: ${message}`,
          });
          continue;
        }
      }

      // Scan content
      const result = scanContent(content, {
        sourceType: request.sourceType,
        skillName: request.skillName,
      });

      this.scansProcessed++;

      results.push({
        success: true,
        data: {
          skillName: result.skillName,
          riskLevel: result.riskLevel,
          riskScore: result.riskScore,
          findings: result.findings,
          checks: result.checks,
          durationMs: result.durationMs,
        },
      });
    }

    const remaining = this.rateLimiter.getRemaining(key);

    const response: BatchScanResponse = {
      success: true,
      results,
      totalDurationMs: Date.now() - startTime,
    };

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': String(remaining),
    });
    res.end(JSON.stringify(response));
  }

  /**
   * Handle GET /api/v1/rules
   */
  private handleRules(res: ServerResponse): void {
    // For now, return a simple response with rule categories
    // In production, this would load actual ATR rules
    const response: RulesResponse = {
      rules: [
        {
          id: 'ATR-2024-001',
          title: 'Prompt Injection Detection',
          severity: 'high',
          category: 'prompt-injection',
        },
        {
          id: 'ATR-2024-002',
          title: 'Tool Poisoning Detection',
          severity: 'critical',
          category: 'tool-poisoning',
        },
        {
          id: 'ATR-2024-003',
          title: 'Context Exfiltration Detection',
          severity: 'high',
          category: 'context-exfiltration',
        },
      ],
      totalCount: 3,
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  /**
   * Handle POST /api/v1/webhook
   */
  private async handleWebhookRegister(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Check authentication
    const auth = authenticate(req, this.config.apiKeys);
    if (!auth.valid) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
      return;
    }

    // Parse body
    const body = await parseJsonBody(req, this.config.requestBodyLimit);
    if (!body.valid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: body.error }));
      return;
    }

    // Validate request
    const validation = validateWebhookRequest(body.data);
    if (!validation.valid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: validation.error }));
      return;
    }

    // Register webhook
    const id = `webhook_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const webhook: RegisteredWebhook = {
      id,
      url: validation.data.url,
      events: validation.data.events,
      secret: validation.data.secret || null,
      createdAt: new Date(),
      active: true,
    };

    this.webhooks.set(id, webhook);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      createdAt: webhook.createdAt.toISOString(),
      active: webhook.active,
    }));
  }

  /**
   * Trigger webhooks for an event
   */
  private triggerWebhooks(event: 'scan.completed' | 'scan.failed', data: unknown): void {
    for (const webhook of this.webhooks.values()) {
      if (!webhook.active || !webhook.events.includes(event)) {
        continue;
      }

      // Fire and forget
      fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.secret ? { 'X-Webhook-Secret': webhook.secret } : {}),
        },
        body: JSON.stringify({ event, data }),
      }).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Failed to trigger webhook ${webhook.id}: ${message}`);
      });
    }
  }
}
