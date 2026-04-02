# @panguard-ai/panguard-skill-auditor

> Three-layer security analysis for AI agent skills: regex patterns, LLM semantics, and community intelligence
>
> 適用於 AI 代理技能的三層安全分析：正規表示式模式、LLM 語義和社群情報

## Installation

```bash
npm install @panguard-ai/panguard-skill-auditor
# or
pnpm add @panguard-ai/panguard-skill-auditor
```

## Quick Start

```typescript
import { auditSkill } from '@panguard-ai/panguard-skill-auditor';

const report = await auditSkill('./my-skill', {
  // Optional: provide LLM for semantic analysis
  // llm: { type: 'openai', model: 'gpt-4' },
  // skipAI: false,  // include AI analysis (default: true if LLM available)
});

console.log(`Risk Level: ${report.riskLevel}`);
console.log(`Risk Score: ${report.riskScore}/100`);
console.log(`Findings: ${report.findings.length}`);

// Print findings by severity
for (const finding of report.findings.filter(f => f.severity === 'critical')) {
  console.log(`CRITICAL: ${finding.title}`);
  console.log(`  ${finding.description}`);
}

// Access context signals (boosters & reducers)
for (const signal of report.contextSignals.signals) {
  console.log(`${signal.type}: ${signal.label} (${signal.weight}x)`);
}
```

## API

### `auditSkill(skillDir, options?)`

Audit a skill directory with all three analysis layers.

**Parameters:**
- `skillDir: string` — Path to skill directory (must contain SKILL.md)
- `options?: AuditOptions` — Configuration

**Returns:** `Promise<AuditReport>`

```typescript
interface AuditReport {
  skillPath: string;
  manifest: SkillManifest | null;
  riskScore: number;              // 0–100
  riskLevel: RiskLevel;           // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  checks: CheckResult[];          // All check results
  findings: AuditFinding[];       // All detected issues
  contextSignals: ContextSignals; // Risk multipliers
  auditedAt: string;              // ISO timestamp
  durationMs: number;             // Total scan time
}
```

### Three-Layer Analysis

**Layer 1: Pattern Matching (Fast, Deterministic)**
- Manifest validation (required fields, format)
- Regex-based instruction patterns (prompt injection, tool poisoning)
- Static code analysis (SAST)
- Secret detection (API keys, tokens)
- Dependency scanning (known CVEs)
- Permission grants analysis

**Layer 2: LLM Semantic Analysis (Catches Intent Mismatches)**
- Detects social engineering in instructions
- Identifies subtle privilege escalation attempts
- Analyzes goal alignment and deception
- Requires ANTHROPIC_API_KEY, OPENAI_API_KEY, or Ollama

**Layer 3: Threat Cloud Lookup (Planned)**
- Community-reported threats
- Supply-chain intelligence
- Skill version history analysis

## Configuration

### `AuditOptions`

```typescript
interface AuditOptions {
  llm?: SkillAnalysisLLM;     // LLM provider config
  skipAI?: boolean;           // Skip Layer 2 (default: false)
  skipATR?: boolean;          // Skip ATR engine (default: false)
  cloudRules?: CompiledRule[]; // Pre-compiled ATR rules
}
```

### Environment Variables

```bash
# LLM Providers (pick one)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OLLAMA_URL=http://localhost:11434

# Optional
LOG_LEVEL=debug
```

## Finding Severity Levels

- **CRITICAL** — Immediate exploitation risk (prompt injection, RCE)
- **HIGH** — Likely to cause security breach (tool poisoning, data exfil)
- **MEDIUM** — Potential misuse (excessive permissions, weak validation)
- **LOW** — Best practice violation (outdated dependencies, hardcoded config)
- **INFO** — Advisory only (missing documentation, LLM skipped)

## Context Signals

Risk multipliers applied before final score calculation:

**Boosters** (increase risk):
- `skill-disables-model` (2.0x) — Skill requests disableModelInvocation
- `requires-dangerous-tool` (1.5x) — Needs shell, code execution
- `unsigned-code` (1.3x) — No code signing metadata

**Reducers** (decrease risk):
- `code-signed` (0.5x) — Skill is cryptographically signed
- `from-trusted-author` (0.7x) — Well-known author on safelist
- `has-tests` (0.8x) — Includes test suite

## Utilities

### Manifest Parsing

```typescript
import { parseSkillManifest } from '@panguard-ai/panguard-skill-auditor';

const manifest = await parseSkillManifest('./my-skill');
console.log(manifest.name, manifest.description);
```

## Related Packages

- [@panguard-ai/scan-core](../scan-core) — Core scanning engine
- [@panguard-ai/atr](../atr) — Agent Threat Rules format
- [@panguard-ai/core](../core) — Shared utilities & LLM integration
