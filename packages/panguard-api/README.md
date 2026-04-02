# PanguardApi - REST API for Skill Scanning

REST API server for third-party integrations to scan MCP skills for security threats.

Provides webhooks, rate limiting, and batch processing for skill security analysis.

## Quick Start

### Installation

```bash
npm install @panguard-ai/panguard-api
```

### Start Server

```bash
# Set required environment variables
export PANGUARD_API_KEYS="your-api-key-here"

# Start server
npx panguard-api
```

The server will start on `0.0.0.0:3200` by default.

### Quick Test

```bash
curl -X POST http://localhost:3200/api/v1/scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "content": "# My Skill\n\nThis is a skill description.",
    "sourceType": "skill"
  }'
```

## API Endpoints

### Scan Single Skill

**Endpoint:** `POST /api/v1/scan`

Scan a single skill for security threats.

**Authentication:** `X-API-Key` header or `?api_key=` query parameter

**Request:**

```json
{
  "content": "string (required if url not provided)",
  "url": "string (optional, https://...)",
  "sourceType": "skill | documentation (optional)",
  "skillName": "string (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "skillName": "string | null",
    "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
    "riskScore": 0-100,
    "findings": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "severity": "info | low | medium | high | critical",
        "category": "string",
        "location": "string (optional)"
      }
    ],
    "checks": [
      {
        "status": "pass | warn | fail | info",
        "label": "string",
        "findings": []
      }
    ],
    "durationMs": 123
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3200/api/v1/scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: my-api-key" \
  -d '{
    "content": "---\nname: MySkill\n---\nInstructions here",
    "sourceType": "skill"
  }'
```

### Batch Scan

**Endpoint:** `POST /api/v1/scan/batch`

Scan multiple skills in a single request.

**Request:**

```json
{
  "skills": [
    {
      "content": "string (required if url not provided)",
      "url": "string (optional)",
      "sourceType": "skill | documentation (optional)",
      "skillName": "string (optional)"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "results": [
    {
      "success": true,
      "data": { ... }
    }
  ],
  "totalDurationMs": 456
}
```

**Example:**

```bash
curl -X POST http://localhost:3200/api/v1/scan/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: my-api-key" \
  -d '{
    "skills": [
      {
        "content": "Skill 1 content",
        "skillName": "skill1"
      },
      {
        "content": "Skill 2 content",
        "skillName": "skill2"
      }
    ]
  }'
```

### Health Check

**Endpoint:** `GET /api/v1/health`

Check server status and statistics.

**Response:**

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime": 12345,
  "scansProcessed": 42
}
```

**Example:**

```bash
curl http://localhost:3200/api/v1/health
```

### List Available Rules

**Endpoint:** `GET /api/v1/rules`

List all available ATR (Agent Threat Rules) for skill analysis.

**Response:**

```json
{
  "rules": [
    {
      "id": "ATR-2024-001",
      "title": "Prompt Injection Detection",
      "severity": "high",
      "category": "prompt-injection"
    }
  ],
  "totalCount": 3
}
```

**Example:**

```bash
curl http://localhost:3200/api/v1/rules
```

### Register Webhook

**Endpoint:** `POST /api/v1/webhook`

Register a webhook to receive scan results.

**Authentication:** Required (X-API-Key)

**Request:**

```json
{
  "url": "https://your-domain.com/webhook",
  "events": ["scan.completed", "scan.failed"],
  "secret": "optional-webhook-secret"
}
```

**Response:**

```json
{
  "success": true,
  "id": "webhook_...",
  "url": "https://your-domain.com/webhook",
  "events": ["scan.completed"],
  "createdAt": "2024-01-01T00:00:00Z",
  "active": true
}
```

**Example:**

```bash
curl -X POST http://localhost:3200/api/v1/webhook \
  -H "Content-Type: application/json" \
  -H "X-API-Key: my-api-key" \
  -d '{
    "url": "https://myapp.com/webhooks/panguard",
    "events": ["scan.completed"]
  }'
```

## Authentication

The API uses API key-based authentication.

**Methods:**
1. Header: `X-API-Key: <your-key>`
2. Query: `?api_key=<your-key>`

**Example:**

```bash
# Using header
curl -H "X-API-Key: my-api-key" http://localhost:3200/api/v1/scan

# Using query parameter
curl "http://localhost:3200/api/v1/scan?api_key=my-api-key"
```

## Rate Limiting

Rate limiting is enforced per API key.

**Default:** 100 requests per minute

**Headers:**
- `X-RateLimit-Remaining`: Number of remaining requests in current minute

**Example Response:**

```
HTTP/1.1 200 OK
X-RateLimit-Remaining: 87
```

When rate limit is exceeded:

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Remaining: 0
Content-Type: application/json

{
  "success": false,
  "error": "Rate limit exceeded"
}
```

## Environment Variables

### Required

- **PANGUARD_API_KEYS**: Comma-separated list of valid API keys (required)

### Optional

- **PANGUARD_API_PORT**: Server port (default: `3200`)
- **PANGUARD_API_HOST**: Server host (default: `0.0.0.0`)
- **PANGUARD_API_RATE_LIMIT**: Requests per minute per key (default: `100`)
- **PANGUARD_API_CORS_ORIGINS**: Comma-separated allowed CORS origins (default: `*`)
- **PANGUARD_API_BODY_LIMIT**: Max request body size in bytes (default: `1000000`)

### Example Configuration

```bash
export PANGUARD_API_PORT=3200
export PANGUARD_API_HOST=127.0.0.1
export PANGUARD_API_KEYS="key1,key2,key3"
export PANGUARD_API_RATE_LIMIT=100
export PANGUARD_API_CORS_ORIGINS="https://myapp.com,https://admin.myapp.com"
export PANGUARD_API_BODY_LIMIT=1000000
```

## Webhook Integration

### Webhook Events

**scan.completed** - Fired when a scan finishes successfully

**scan.failed** - Fired when a scan encounters an error

### Webhook Payload

```json
{
  "event": "scan.completed",
  "data": {
    "success": true,
    "data": {
      "skillName": "MySkill",
      "riskLevel": "HIGH",
      "riskScore": 75,
      "findings": [...],
      "checks": [...],
      "durationMs": 234
    }
  }
}
```

### Webhook Headers

- `Content-Type: application/json`
- `X-Webhook-Secret` (if configured)

### Webhook Authentication

If you configure a secret during webhook registration, requests will include an `X-Webhook-Secret` header with the value you provided. Use this to verify webhook authenticity.

## CORS Support

CORS headers are automatically set based on the `PANGUARD_API_CORS_ORIGINS` environment variable.

**Example:**

```bash
export PANGUARD_API_CORS_ORIGINS="https://app.example.com,https://admin.example.com"
```

**Response headers:**

```
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET,POST,OPTIONS
Access-Control-Allow-Headers: Content-Type,X-API-Key
Access-Control-Max-Age: 3600
```

## Error Handling

All endpoints return JSON responses with appropriate HTTP status codes.

### 400 Bad Request

Invalid request format or validation failure.

```json
{
  "success": false,
  "error": "content: Content must be less than 1000000 characters"
}
```

### 401 Unauthorized

Missing or invalid API key.

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

### 429 Too Many Requests

Rate limit exceeded.

```json
{
  "success": false,
  "error": "Rate limit exceeded"
}
```

### 500 Internal Server Error

Server-side error.

```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Development

### Build

```bash
npm run build
```

### Type Check

```bash
npm run typecheck
```

### Run Tests

```bash
npm test
```

### Watch Mode

```bash
npm run dev
```

## Security Considerations

1. **API Keys**: Use strong, randomly generated API keys (min 32 characters recommended)
2. **HTTPS**: Always use HTTPS in production to protect API keys in transit
3. **Webhooks**: Implement webhook secret validation on your receiving endpoint
4. **Rate Limiting**: Configure appropriate rate limits for your use case
5. **CORS**: Restrict CORS origins to only trusted domains
6. **Body Limit**: Consider lowering body limit if handling untrusted input

## Deployment

### Docker Example

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist dist

ENV NODE_ENV=production
ENV PANGUARD_API_PORT=3000
ENV PANGUARD_API_HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "dist/cli.js"]
```

### Docker Compose Example

```yaml
version: '3.8'

services:
  panguard-api:
    image: panguard-api:latest
    ports:
      - "3200:3200"
    environment:
      PANGUARD_API_KEYS: ${PANGUARD_API_KEYS}
      PANGUARD_API_PORT: 3200
      PANGUARD_API_HOST: 0.0.0.0
      PANGUARD_API_RATE_LIMIT: 100
```

## License

MIT

## Support

For issues and feature requests, visit [https://github.com/panguard-ai/panguard-ai](https://github.com/panguard-ai/panguard-ai)
