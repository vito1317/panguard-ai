# @panguard-ai/threat-cloud

> Community threat intelligence backend for Panguard AI
>
> Panguard AI 的社群威脅情報後端

## Overview

Threat Cloud is a cloud-based intelligence service that:
- Aggregates anonymized threat reports from all Panguard users
- Publishes new ATR rules from community detections
- Provides reputation scoring for skills and threats
- Issues security badges for verified-safe skills

## Installation

```bash
npm install @panguard-ai/threat-cloud
# or
pnpm add @panguard-ai/threat-cloud
```

## Quick Start

### Server

```typescript
import { ThreatCloudServer, ThreatCloudDB } from '@panguard-ai/threat-cloud';

const db = new ThreatCloudDB('./data/threats.db');
await db.open();

const server = new ThreatCloudServer({ port: 8080, database: db });
await server.start();
console.log('Threat Cloud running at http://localhost:8080');
```

### Client

```typescript
import { ThreatCloudClient } from '@panguard-ai/panguard-guard';

const client = new ThreatCloudClient({
  apiUrl: 'https://threat-cloud.panguard.ai',
  apiKey: process.env.THREAT_CLOUD_API_KEY,
});

// Report a threat (anonymized)
await client.reportThreat({
  type: 'prompt-injection',
  skillName: 'some-skill',
  confidence: 0.95,
});

// Query threats
const threats = await client.queryThreats({
  category: 'tool-poisoning',
  minSeverity: 'high',
});

// Get skill reputation
const rep = await client.getSkillReputation('org/some-skill');
console.log(`Reputation: ${rep.score}/100`);
```

## API

### `ThreatCloudServer`

Express-based REST API for threat intelligence.

**Endpoints:**
- `POST /api/threats/report` — Submit anonymized threat
- `GET /api/threats/query` — Search for known threats
- `GET /api/skills/:name/reputation` — Check skill reputation
- `GET /api/badges/:skillName` — Get security badge (SVG)
- `POST /api/atr/propose` — Contribute a new ATR rule

### `ThreatCloudDB`

SQLite database for threat storage.

**Methods:**
- `recordThreat(threat)` — Store threat
- `queryThreats(filter)` — Search threats
- `getSkillReputation(name)` — Compute skill score
- `recordScan(event)` — Log scan event
- `getAggregatedMetrics()` — Dashboard stats

### `LLMReviewer`

LLM-based review for ATR rule proposals (gate-keeping).

```typescript
import { LLMReviewer } from '@panguard-ai/threat-cloud';

const reviewer = new LLMReviewer({ model: 'gpt-4' });

const decision = await reviewer.reviewATRProposal({
  id: 'proposed-rule-1',
  title: 'New Prompt Injection Variant',
  patterns: ['...'],
});
// => { approved: true, confidence: 0.92, feedback: '...' }
```

### `BackupManager`

Automated database backups.

```typescript
import { BackupManager } from '@panguard-ai/threat-cloud';

const backup = new BackupManager(db, { interval: '24h' });
await backup.start();
```

### Badge API

SVG security badges for skill repositories.

```typescript
const router = createBadgeRouter(db);
// GET /badge/org/skill-name.svg
// Returns: [skill-audit A] or [threats HIGH] depending on reputation
```

## Data Model

### Threat

```typescript
interface SkillThreatSubmission {
  skillName: string;
  threatType: string;       // Category from ATR
  detectedAt: string;
  confidence: number;       // 0–1
  details?: string;
  scanHash?: string;        // Content hash (for dedup)
}
```

### Aggregated Metrics

```typescript
interface AggregatedMetrics {
  totalScans: number;
  threatsByCategory: Record<string, number>;
  highestRiskSkills: Array<{ name: string; threats: number }>;
  communityParticipants: number;
  avgConfidence: number;
}
```

### ATR Proposal

```typescript
interface ATRProposal {
  id: string;
  title: string;
  category: string;
  patterns: string[];
  testCases: { input: string; expected: boolean }[];
  proposedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
}
```

## Configuration

### Environment Variables

```bash
THREAT_CLOUD_PORT=8080
THREAT_CLOUD_DB_PATH=./data/threats.db
THREAT_CLOUD_API_KEY=sk-tc-...
ANTHROPIC_API_KEY=sk-ant-...          # For LLM reviewer
LOG_LEVEL=info
```

### Server Config

```typescript
interface ServerConfig {
  port: number;
  database: ThreatCloudDB;
  backupInterval?: string;             // '24h', '7d', etc.
  llmReviewer?: LLMReviewer;
  maxPayloadSize?: string;              // Default: '10mb'
}
```

## Security & Privacy

- **Anonymized Reports** — No PII, only threat type and confidence
- **Content Hashing** — Deduplicates identical threats
- **Approval Gates** — LLM reviews ATR rule proposals
- **Audit Logging** — All submissions logged with timestamps
- **Rate Limiting** — Per-API-key quota enforcement

## Related Packages

- [@panguard-ai/panguard-guard](../panguard-guard) — Client integration
- [@panguard-ai/atr](../atr) — Detection rules (output of Threat Cloud)
- [@panguard-ai/core](../core) — Shared types
