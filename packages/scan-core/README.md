# @panguard-ai/scan-core

> Unified skill scanning engine for prompt injection, tool poisoning, and agent threats
>
> 用於提示注入、工具中毒和代理威脅的統一技能掃描引擎

## Installation

```bash
npm install @panguard-ai/scan-core
# or
pnpm add @panguard-ai/scan-core
```

## Quick Start

```typescript
import { scanContent } from '@panguard-ai/scan-core';
import { readFileSync } from 'fs';

const skillContent = readFileSync('./SKILL.md', 'utf-8');

const result = await scanContent(skillContent, {
  sourceType: 'skill',
  skillName: 'my-dangerous-skill',
  // Optionally load ATR rules for deeper detection
  // atrRules: compiledRules
});

console.log(`Risk Level: ${result.riskLevel}`);
console.log(`Risk Score: ${result.riskScore}/100`);
console.log(`Findings: ${result.findings.length}`);

for (const finding of result.findings) {
  console.log(`[${finding.severity}] ${finding.title}`);
  console.log(`  Category: ${finding.category}`);
}
```

## API

### Main Entry Point

#### `scanContent(content, options?)`

Scan raw skill content and return detailed results.

**Parameters:**
- `content: string` — Raw SKILL.md text or documentation
- `options?: ScanOptions` — Optional configuration

**Returns:** `Promise<ScanResult>`

```typescript
interface ScanResult {
  skillName: string | null;           // Parsed from frontmatter
  manifest: SkillManifest | null;     // Structured YAML frontmatter
  findings: Finding[];                // All detected issues
  checks: CheckResult[];              // Results by check category
  riskScore: number;                  // 0–100 composite score
  riskLevel: RiskLevel;               // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  contextSignals: ContextSignals;     // Boosters & reducers applied
  atrRulesEvaluated: number;          // ATR rules processed
  atrPatternsMatched: number;         // Patterns that triggered
  durationMs: number;                 // Scan time
}
```

### Utilities

#### Markdown Processing

- `stripMarkdownNoise(text)` — Remove formatting for pattern matching
- `extractCodeBlocks(text)` — Get all `code` blocks
- `stripCodeBlocks(text)` — Remove code sections
- `stripNegationSections(text)` — Remove sections starting with "DO NOT"
- `prepareContent(text)` — Full preprocessing pipeline

#### Manifest & Parsing

- `parseManifestFromString(text)` — Extract and validate YAML frontmatter
- `parseSkillName(text)` — Extract skill name from manifest or filename

#### Context Signals

- `detectContextSignals(text)` — Detect legitimate vs. malicious context (multiplier 0.5–2.0)

#### Pattern Detection

- `checkInstructions(text)` — Scan for instruction-based attacks
- `detectSecrets(text)` — Find exposed API keys, tokens, credentials

#### ATR Integration

- `compileRules(rules)` — Pre-compile YAML ATR rules to regex
- `scanWithATR(content, rules)` — Run compiled rules against content

#### Risk Scoring

- `calculateRiskScore(findings, multiplier?)` — Compute weighted risk (0–100)

## Finding Categories

| Category               | Detected Threats                              |
| ---------------------- | --------------------------------------------- |
| `manifest`             | Missing/malformed SKILL.md metadata           |
| `prompt-injection`     | Direct LLM instruction override attempts      |
| `tool-poisoning`       | Malicious tool definitions or arguments       |
| `context-exfiltration` | Attempts to extract system prompts/context    |
| `agent-manipulation`   | Commands to change agent behavior             |
| `privilege-escalation` | Requests for elevated permissions             |
| `excessive-autonomy`   | Unlimited or unrestricted tool invocations    |
| `data-poisoning`       | Injection into training data or memory        |
| `model-abuse`          | Jailbreaks, token smuggling, model theft      |
| `skill-compromise`     | Supply-chain attacks, version tampering       |
| `code`                 | SAST findings in embedded code                |
| `secrets`              | Exposed API keys, passwords, credentials      |
| `dependency`           | Vulnerable or malicious npm packages          |
| `permission`           | Over-scoped or dangerous capability grants    |
| `ai-analysis`          | LLM-based semantic analysis findings          |
| `atr`                  | ATR rule matches                              |

## Configuration

```typescript
interface ScanOptions {
  sourceType?: 'skill' | 'documentation';  // Hint for detection tuning
  atrRules?: CompiledRule[];                // Pre-compiled ATR rules
  skillName?: string;                       // Override name from manifest
}
```

## Environment Variables

```bash
# Optional: Use a local LLM for semantic analysis (advanced)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral
```

## Related Packages

- [@panguard-ai/panguard-skill-auditor](../panguard-skill-auditor) — Full audit with AI checks
- [@panguard-ai/atr](../atr) — Agent Threat Rules format & engine
- [@panguard-ai/core](../core) — Shared utilities
