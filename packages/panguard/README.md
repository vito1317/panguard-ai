# @panguard-ai/panguard

> Unified CLI and SDK for Panguard AI security platform
>
> Panguard AI 統一資安平台的 CLI 和 SDK

## Installation

```bash
npm install -g @panguard-ai/panguard
# or
pnpm add -g @panguard-ai/panguard
```

## Quick Start

### CLI

```bash
# Scan a skill for threats
panguard scan ./my-skill

# Start real-time monitoring
panguard guard start

# Check monitoring status
panguard guard status

# Initialize config (wizard)
panguard init

# Run full security audit
panguard audit --report pdf
```

### SDK

```typescript
import {
  runScan,
  GuardEngine,
  buildPanguardConfig,
} from '@panguard-ai/panguard';

// Scan a skill
const result = await runScan({
  skillDir: './my-skill',
  includeAI: true,
});
console.log(`Risk: ${result.riskLevel} (${result.riskScore})`);

// Start monitoring
const config = await buildPanguardConfig();
const guard = new GuardEngine(config);
await guard.start();
```

## CLI Commands

```
panguard [command] [options]

Commands:
  scan [path]              Scan skill for security issues
  guard [start|stop|status] Real-time monitoring
  init                     Interactive setup wizard
  audit                    Full security audit (with report)
  config [get|set]         Manage configuration
  help [cmd]               Show help for command

Options:
  --format [text|json|pdf] Output format (default: text)
  --verbose                Detailed output
  --no-ai                  Skip LLM analysis
  --only-critical          Show critical findings only
```

## Core Exports

### Scanning

- `runScan(config)` — Audit a skill directory
- `generatePdfReport(result)` — Create compliance report

### Monitoring

- `GuardEngine` — Real-time detection and response
- `DashboardServer` — Web UI for threat visualization

### Configuration

- `runInitWizard()` — Interactive setup
- `buildPanguardConfig(answers)` — Create config from answers
- `readConfig(path)` — Load from file
- `writeConfig(path, config)` — Save to file

### Data Bridges

- `scanFindingsToComplianceFindings(scanResult)` — Convert for reporting

## Configuration File

Default location: `~/.panguard/config.json`

```json
{
  "mode": "protection",
  "language": "en",
  "guard": {
    "enabled": true,
    "logSources": ["/var/log/auth.log", "/var/log/syslog"],
    "notificationChannels": ["slack"],
    "playbookDir": "./playbooks"
  },
  "scan": {
    "includeAI": true,
    "includeATR": true
  },
  "api": {
    "threatCloudUrl": "https://threat-cloud.panguard.ai"
  }
}
```

## Environment Variables

```bash
PANGUARD_MODE=protection              # learning | protection
PANGUARD_TIER=pro                     # free | pro | enterprise
PANGUARD_LOG_LEVEL=info               # debug | info | warn | error
ANTHROPIC_API_KEY=sk-ant-...          # For LLM analysis
SLACK_WEBHOOK=https://hooks.slack.com/...
THREAT_CLOUD_API_KEY=...
```

## Workflow Examples

### Scan a New Skill

```bash
panguard scan ./my-skill --format json > report.json
echo "Risk Level: $(jq .riskLevel report.json)"
```

### Continuous Monitoring

```bash
panguard guard start
panguard guard status --watch  # refresh every 5s
```

### Generate Compliance Report

```bash
panguard scan ./skill --format pdf --output compliance.pdf
```

## Related Packages

- [@panguard-ai/scan-core](../scan-core) — Scanning engine
- [@panguard-ai/panguard-guard](../panguard-guard) — Monitoring
- [@panguard-ai/panguard-skill-auditor](../panguard-skill-auditor) — Full audits
- [@panguard-ai/core](../core) — Shared utilities
