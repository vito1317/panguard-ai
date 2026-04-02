#!/usr/bin/env node
/**
 * PanguardApi CLI - Start the REST API server from command line
 *
 * Environment variables:
 *   PANGUARD_API_PORT - Server port (default: 3200)
 *   PANGUARD_API_HOST - Server host (default: 0.0.0.0)
 *   PANGUARD_API_KEYS - Comma-separated API keys
 *   PANGUARD_API_RATE_LIMIT - Requests per minute (default: 100)
 *   PANGUARD_API_CORS_ORIGINS - Comma-separated allowed CORS origins
 */

import { PanguardApiServer } from './server.js';
import type { ApiConfig } from './types.js';

// ---------------------------------------------------------------------------
// Environment Variables
// ---------------------------------------------------------------------------

const port = parseInt(process.env.PANGUARD_API_PORT || '3200', 10);
const host = process.env.PANGUARD_API_HOST || '0.0.0.0';
const apiKeys = (process.env.PANGUARD_API_KEYS || '')
  .split(',')
  .map((k) => k.trim())
  .filter((k) => k.length > 0);
const rateLimit = parseInt(process.env.PANGUARD_API_RATE_LIMIT || '100', 10);
const corsOrigins = (process.env.PANGUARD_API_CORS_ORIGINS || '*')
  .split(',')
  .map((o) => o.trim())
  .filter((o) => o.length > 0);
const requestBodyLimit = parseInt(process.env.PANGUARD_API_BODY_LIMIT || '1000000', 10);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateConfig(): void {
  if (apiKeys.length === 0) {
    console.error('Error: PANGUARD_API_KEYS must be set (comma-separated list)');
    process.exit(1);
  }

  if (isNaN(port) || port < 1 || port > 65535) {
    console.error('Error: PANGUARD_API_PORT must be a valid port number (1-65535)');
    process.exit(1);
  }

  if (isNaN(rateLimit) || rateLimit < 1) {
    console.error('Error: PANGUARD_API_RATE_LIMIT must be a positive number');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  validateConfig();

  const config: ApiConfig = {
    port,
    host,
    apiKeys,
    rateLimit: {
      requestsPerMinute: rateLimit,
    },
    corsOrigins,
    requestBodyLimit,
  };

  console.log('Starting PanguardApi server...');
  console.log(`Config:`);
  console.log(`  Port: ${port}`);
  console.log(`  Host: ${host}`);
  console.log(`  API Keys: ${apiKeys.length}`);
  console.log(`  Rate Limit: ${rateLimit} requests/minute`);
  console.log(`  CORS Origins: ${corsOrigins.join(', ')}`);

  const server = new PanguardApiServer(config);

  try {
    await server.start();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to start server: ${message}`);
    process.exit(1);
  }

  // Handle graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
      try {
        await server.stop();
        process.exit(0);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error during shutdown: ${message}`);
        process.exit(1);
      }
    });
  }

  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Uncaught exception: ${message}`);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    console.error(`Unhandled rejection: ${message}`);
    process.exit(1);
  });
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Fatal error: ${message}`);
  process.exit(1);
});
