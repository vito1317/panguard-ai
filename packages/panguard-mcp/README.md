# @panguard-ai/panguard-mcp

> MCP server for controlling Panguard security scanning and monitoring from Claude Desktop, Cursor, or Claude Code
>
> 用於從 Claude Desktop、Cursor 或 Claude Code 控制 Panguard 安全掃描和監控的 MCP 伺服器

## Installation

```bash
npm install @panguard-ai/panguard-mcp
# or
pnpm add @panguard-ai/panguard-mcp
```

## Quick Start

### 1. Install as MCP Server (Claude Desktop)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "panguard": {
      "command": "node",
      "args": ["/path/to/dist/server.js"],
      "env": {
        "PANGUARD_MODE": "protection"
      }
    }
  }
}
```

### 2. Use from Claude Code / Cursor

```typescript
import { startMCPServer } from '@panguard-ai/panguard-mcp';

// Start server
const server = await startMCPServer({ port: 3001 });
console.log('Panguard MCP ready at port 3001');

// Now Claude can call tools:
// @panguard/scan-skill: Scan SKILL.md for threats
// @panguard/start-guard: Enable real-time monitoring
// @panguard/check-threat: Query recent detections
```

### 3. Direct Programmatic Use

```typescript
import { getAllToolDefinitions, dispatchTool } from '@panguard-ai/panguard-mcp';

const tools = await getAllToolDefinitions();
// => [
//   { name: 'scan-skill', description: 'Scan skill...' },
//   { name: 'start-guard', description: 'Enable monitoring...' },
//   ...
// ]

const result = await dispatchTool('scan-skill', {
  skillPath: '/path/to/skill',
  reportFormat: 'json',
});
console.log(result);
```

## Available Tools

### Scanning

**`scan-skill`** — Audit a skill for security issues
```json
{
  "skillPath": "/path/to/skill",
  "reportFormat": "json" | "markdown",
  "includeLLMAnalysis": true,
  "atrRulesOnly": false
}
```

**`scan-content`** — Scan raw content (SKILL.md text or URL)
```json
{
  "content": "SKILL frontmatter and instructions...",
  "skillName": "optional-name"
}
```

**`scan-url`** — Scan a skill from GitHub or public URL
```json
{
  "url": "https://github.com/user/skill",
  "branch": "main"
}
```

### Monitoring

**`start-guard`** — Enable real-time endpoint monitoring
```json
{
  "mode": "protection",
  "playbookDir": "/path/to/playbooks"
}
```

**`stop-guard`** — Stop monitoring gracefully
```json
{}
```

**`guard-status`** — Get current monitoring state
```json
{}
```

### Threat Intelligence

**`query-threats`** — Search Threat Cloud for known threats
```json
{
  "skillName": "some-skill",
  "category": "prompt-injection",
  "minSeverity": "high"
}
```

**`report-threat`** — Share anonymized threat with Threat Cloud
```json
{
  "threatType": "prompt-injection",
  "skillName": "detected-skill",
  "confidence": 0.95
}
```

## Configuration

Set via environment or MCP env section:

```bash
PANGUARD_MODE=protection
PANGUARD_GUARD_PORT=3001
PANGUARD_LOG_LEVEL=info
ANTHROPIC_API_KEY=sk-ant-...          # For LLM analysis
THREAT_CLOUD_API_KEY=...              # For cloud intel
SLACK_WEBHOOK=https://hooks.slack.com/... # Notifications
```

## Architecture

Panguard MCP exposes four core subsystems as tools:

1. **Skill Auditor** — Scan any skill for 16 threat categories
2. **Guard Engine** — Start/stop real-time monitoring
3. **ATR Engine** — Evaluate Agent Threat Rules
4. **Threat Cloud** — Community threat intelligence

## Related Packages

- [@panguard-ai/panguard-skill-auditor](../panguard-skill-auditor) — Skill scanning logic
- [@panguard-ai/panguard-guard](../panguard-guard) — Monitoring engine
- [@panguard-ai/threat-cloud](../threat-cloud) — Intelligence backend
- [@panguard-ai/atr](../atr) — Detection rules
