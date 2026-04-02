# @panguard-ai/core

> Shared utilities, types, and services for the Panguard AI platform
>
> Panguard AI 平台共用實用程式、型別和服務

## Installation

```bash
npm install @panguard-ai/core
# or
pnpm add @panguard-ai/core
```

## Quick Start

```typescript
import {
  createLogger,
  initI18n,
  MonitorEngine,
  DetectionEngine,
  calculateSecurityScore,
} from '@panguard-ai/core';

// Initialize logging and i18n
const logger = createLogger('myApp');
await initI18n('en');

// Create a monitor
const monitor = new MonitorEngine({
  logSources: ['/var/log/auth.log'],
  processMonitoring: true,
});
await monitor.start();

// Score security
const score = calculateSecurityScore([
  { type: 'firewall_enabled', weight: 0.3, value: true },
  { type: 'updates_current', weight: 0.4, value: true },
  { type: 'mfa_adoption', weight: 0.3, value: 0.95 },
]);
console.log(`Security score: ${score.grade} (${score.score}%)`);
```

## API

### Logging

- `createLogger(name)` — Create a namespaced logger
- `setLogLevel(level)` — Set minimum log level (debug, info, warn, error)

### Internationalization (i18n)

- `initI18n(language)` — Initialize with 'en' or 'zh-TW'
- `changeLanguage(lang)` — Switch language at runtime
- `t(key, interpolations?)` — Translate key with optional variables

### Discovery

- `detectOS()` — Detect operating system details
- `scanOpenPorts()` — Scan for listening ports
- `detectServices()` — Identify running services and versions
- `detectSecurityTools()` — Check for installed EDR, firewalls, antivirus
- `auditUsers()` — List active users and groups

### Monitoring

- `MonitorEngine` — Multi-source threat detection engine
- `LogMonitor` — Stream and analyze logs in real-time
- `ProcessMonitor` — Watch for suspicious process behaviors
- `FileMonitor` — Monitor filesystem changes

### Scoring

- `calculateSecurityScore(factors)` — Compute overall security posture (0–100)
- `scoreToGrade(score)` — Convert to A/B/C/D/F letter grade
- `scoreToColor(score)` — Get ANSI color (green/yellow/red)

### CLI Utilities

- `c(text, color)` — Colorize text (red, green, yellow, blue, cyan, magenta)
- `banner(title)` — Print large ASCII banner
- `table(data, columns)` — Render formatted table
- `progressBar(current, total)` — Display progress bar
- `promptSelect(question, choices)` — Interactive multi-choice prompt
- `WizardEngine` — Build step-by-step interactive flows

### Validation & Sanitization

- `validateInput(value, schema)` — Validate against Zod schema
- `sanitizeString(str)` — Remove HTML/dangerous characters
- `validateFilePath(path)` — Ensure path is within allowed directory

### AI & LLM

- `createLLM(config)` — Create LLM client (OpenAI, Anthropic, Ollama)
- `SmartRouter` — Route requests based on complexity/cost
- `AIQuotaManager` — Enforce token/request limits per tier

## Configuration

All components support environment variables:

```bash
# Logging
LOG_LEVEL=debug

# i18n
LANGUAGE=zh-TW

# Monitoring
MONITOR_LOG_SOURCES=/var/log/auth.log,/var/log/syslog
MONITOR_PROCESS_ENABLED=true

# LLM
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
OLLAMA_URL=http://localhost:11434

# Tiers
PANGUARD_TIER=pro
```

## Related Packages

- [@panguard-ai/scan-core](../scan-core) — Unified skill scanning
- [@panguard-ai/panguard-guard](../panguard-guard) — Real-time monitoring
- [@panguard-ai/atr](../atr) — Agent Threat Rules engine
