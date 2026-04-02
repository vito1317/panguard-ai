# @panguard-ai/panguard-guard

> Real-time AI endpoint monitoring with behavioral analysis and SOAR playbooks
>
> 具有行為分析和 SOAR 劇本的實時 AI 端點監控

## Installation

```bash
npm install @panguard-ai/panguard-guard
# or
pnpm add @panguard-ai/panguard-guard
```

## Quick Start

```typescript
import { GuardEngine, loadConfig } from '@panguard-ai/panguard-guard';

// Load or create config
const config = await loadConfig('./panguard.config.json');

// Create engine
const guard = new GuardEngine(config);

// Start monitoring
await guard.start();
console.log('Monitoring started. Running in', guard.getMode());

// Listen for threats
guard.on('threat', (threat) => {
  console.log(`[${threat.severity}] ${threat.title}`);
  // Auto-response via playbooks or manual confirmation
});

// Graceful shutdown
process.on('SIGINT', () => guard.stop());
```

## API

### `GuardEngine`

Main orchestrator for real-time monitoring.

**Methods:**
- `start()` — Begin monitoring from all sources
- `stop()` — Stop all monitors gracefully
- `getMode()` — Returns 'learning' or 'protection'
- `on(event, callback)` — Subscribe to threats, detections
- `investigate(threat)` — Run dynamic investigation
- `respond(threat, action)` — Execute response playbook
- `getDashboard()` — Get current threat dashboard

### Multi-Agent Pipeline

- `DetectAgent` — Pattern & correlation detection
- `AnalyzeAgent` — LLM-based threat analysis & classification
- `RespondAgent` — Executes playbook actions (isolate, block, alert)
- `ReportAgent` — Generates incident reports

### Monitors & Collectors

- `LogCollector` — Parse syslog, auth.log, application logs
- `DpiMonitor` — Deep packet inspection for network threats
- `RootkitDetector` — Kernel-level attack detection
- `SkillWatcher` — Monitor skill/plugin installations & behavior

### Anomaly Detection

- `AnomalyScorer` — Behavioral baseline analysis
- `EventCorrelator` — Multi-event pattern matching
- `createEmptyBaseline()` — Initialize learning period
- `checkDeviation(event, baseline)` — Detect deviations
- `switchToProtectionMode()` — Activate enforcement

### SOAR Playbooks

```typescript
import { PlaybookEngine, loadPlaybooksFromDir } from '@panguard-ai/panguard-guard';

const playbooks = await loadPlaybooksFromDir('./playbooks');
const engine = new PlaybookEngine(playbooks);

const result = await engine.execute('ransomware_detected', threat);
// => { executed_actions: ['isolate_network', 'snapshot_disk'], ... }
```

### Notifications

```typescript
import { sendNotifications } from '@panguard-ai/panguard-guard';

await sendNotifications(threat, {
  slack: { webhook: 'https://hooks.slack.com/...' },
  telegram: { token: '...', chatId: '...' },
  email: { to: 'security@company.com' },
});
```

### Dashboard & Web UI

```typescript
import { DashboardServer } from '@panguard-ai/panguard-guard';

const server = new DashboardServer({ port: 3000 });
await server.start();
// => http://localhost:3000 (real-time threat visualization)
```

### Threat Cloud Integration

```typescript
import { ThreatCloudClient } from '@panguard-ai/panguard-guard';

const tc = new ThreatCloudClient({ apiUrl: 'https://threat-cloud.panguard.ai' });

// Share anonymized threat data with community
await tc.reportThreat({
  type: 'prompt_injection',
  confidence: 0.95,
  skill: 'some-skill',
});

// Get community intelligence
const threats = await tc.queryThreats({ category: 'tool_poisoning' });
```

### Skill Security

```typescript
import { SkillWatcher, SkillWhitelistManager } from '@panguard-ai/panguard-guard';

// Whitelist trusted skills
const whitelist = new SkillWhitelistManager('./skills.whitelist.json');
whitelist.add('org/official-skill', { severity: 'low', verified: true });

// Watch for skill changes
const watcher = new SkillWatcher(guard, whitelist);
watcher.on('skill_modified', (change) => {
  console.log(`Skill ${change.skill} was updated`);
  // Re-audit the skill
});
```

## Configuration

### `GuardConfig`

```typescript
interface GuardConfig {
  mode: 'learning' | 'protection';
  learningDuration: number; // days before switching to protection
  logSources: string[];     // /var/log/auth.log, etc.
  notificationConfig?: NotificationConfig;
  playbookDir?: string;     // Path to SOAR playbooks
  threatCloudUrl?: string;
  licenseKey?: string;
}
```

### Environment Variables

```bash
PANGUARD_MODE=protection
PANGUARD_LOG_SOURCES=/var/log/auth.log,/var/log/syslog
SLACK_WEBHOOK=https://hooks.slack.com/...
TELEGRAM_TOKEN=...
THREAT_CLOUD_API_KEY=...
```

## Event Types

```
'threat'              - New threat detected
'detection'           - Pattern match found
'investigation'       - Dynamic analysis complete
'response'            - Action executed
'correlation'         - Multi-event pattern matched
'baseline_updated'    - Learning period data updated
'mode_switched'       - Learning → Protection transition
```

## Related Packages

- [@panguard-ai/core](../core) — Shared monitoring engines
- [@panguard-ai/atr](../atr) — Detection rules
- [@panguard-ai/threat-cloud](../threat-cloud) — Community intelligence
- [@panguard-ai/panguard-mcp](../panguard-mcp) — MCP server integration
