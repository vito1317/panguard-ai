# Panguard AI Developer Quickstart

Get up and running with Panguard AI in under 10 minutes.

## Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org/))
- **pnpm** 9+ — install with: `npm install -g pnpm@latest`
- **Git** (for cloning)
- **Bash** (for scripts)

Verify:
```bash
node --version    # v20.0.0 or higher
pnpm --version    # 9.0.0 or higher
```

## 1. Clone & Install

```bash
git clone https://github.com/panguard-ai/panguard-ai.git
cd panguard-ai
pnpm install
```

**What this does:**
- Downloads all packages in the monorepo
- Installs shared dependencies (TypeScript, vitest, ESLint, etc.)
- Symlinks local packages together via pnpm workspaces

## 2. Build All Packages

```bash
pnpm build
```

**What this does:**
- Compiles TypeScript in all packages to `dist/`
- Runs any pre-build scripts
- Takes ~2 minutes first time

**Troubleshooting:**
- If build fails: `pnpm clean && pnpm install && pnpm build`
- Check Node version: `node --version`

## 3. Run Tests

```bash
pnpm test
```

**What this does:**
- Runs Vitest across all packages
- Takes ~30 seconds
- Shows coverage summary

**Watch mode:**
```bash
pnpm test:watch
```

**Coverage report:**
```bash
pnpm test:coverage
```

## Project Structure

```
packages/
├── core/                  ← Shared utilities, i18n, discovery, monitoring
├── scan-core/            ← Unified skill scanning engine
├── panguard-skill-auditor/ ← Full audit with AI checks
├── panguard-guard/       ← Real-time monitoring & SOAR playbooks
├── panguard-mcp/         ← MCP server for Claude integration
├── panguard/             ← Main CLI & SDK
├── threat-cloud/         ← Community threat intelligence backend
├── atr/                  ← Agent Threat Rules (detection rules)
└── [other packages]

docs/                     ← Documentation
scripts/                  ← Developer utilities
tests/                    ← Integration tests
```

**Key packages:**
- **core** — Start here for shared utilities
- **scan-core** — Used by auditor & MCP
- **panguard-guard** — Real-time monitoring engine
- **atr** — Detection rule format & engine

## Common Tasks

### Add a New ATR Rule

1. Create rule file: `packages/atr/rules/[category]/[name].yaml`

2. Follow this structure:
```yaml
title: Your Rule Title
id: ATR-2026-NNN
severity: high
category: prompt-injection
description: |
  What this rule detects...

detection:
  conditions:
    - field: user_input
      operator: regex
      value: "(?i)your_pattern"
  condition: any

response:
  actions: [block_input, alert]

test_cases:
  true_positives:
    - input: "malicious input"
      expected: triggered
  true_negatives:
    - input: "normal input"
      expected: not_triggered
```

3. Validate:
```bash
pnpm --filter @panguard-ai/atr test
```

4. Test in scanner:
```bash
npx tsx scripts/debug-scan.ts path/to/SKILL.md
```

### Add a New CLI Command

1. Create file: `packages/panguard/src/cli/commands/[name].ts`

2. Export a command handler:
```typescript
export async function handleMyCommand(args: string[], options: any) {
  // Parse arguments and execute
  console.log('Command executed!');
}
```

3. Register in `packages/panguard/src/cli/index.ts`:
```typescript
case 'my-command':
  await handleMyCommand(args.slice(1), options);
  break;
```

4. Test:
```bash
pnpm build
node packages/panguard/dist/cli/index.js my-command --help
```

### Test Changes Locally

1. **Rebuild**:
```bash
pnpm build
```

2. **Run CLI**:
```bash
node packages/panguard/dist/cli/index.js scan path/to/skill
```

3. **Run debug scanner**:
```bash
npx tsx scripts/debug-scan.ts path/to/SKILL.md
```

4. **Start Guard monitoring**:
```bash
node packages/panguard-guard/dist/cli.js --config panguard.config.json
```

### Run Website Locally

1. **Start dev server**:
```bash
pnpm website:dev
```

2. **Build production**:
```bash
pnpm website:build
```

3. **Start production**:
```bash
pnpm website:start
```

Opens http://localhost:3000

## Code Quality

### Format Code

```bash
pnpm format
```

### Check Format

```bash
pnpm format:check
```

### Lint

```bash
pnpm lint
```

### Fix Lint Issues

```bash
pnpm lint:fix
```

### Type Check

```bash
pnpm typecheck
```

### Full CI Pipeline

```bash
pnpm ci:lint && pnpm ci:test && pnpm ci:build
```

## Useful Scripts

| Command                      | What it does                            |
| ---------------------------- | --------------------------------------- |
| `pnpm dev`                   | Start all packages in dev mode          |
| `pnpm clean`                 | Remove all `dist/` directories          |
| `pnpm test:watch`            | Run tests on file changes               |
| `pnpm test:coverage`         | Generate coverage report                |
| `npx tsx scripts/debug-scan.ts` | Scan SKILL.md with detailed output    |
| `pnpm website:dev`           | Start website dev server                |
| `pnpm lint && pnpm format`   | Fix all code issues                     |

## Common Issues

### "Command not found: pnpm"

Install globally:
```bash
npm install -g pnpm@latest
```

### Build fails: "Cannot find module"

Clear and reinstall:
```bash
pnpm clean
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### Tests timeout

Increase timeout:
```bash
pnpm test --testTimeout=20000
```

### Port already in use (Guard / Dashboard)

Change port:
```bash
PANGUARD_GUARD_PORT=3001 node packages/panguard-guard/dist/cli.js
```

### TypeScript errors after editing

Run type check:
```bash
pnpm typecheck
```

## Next Steps

1. **Read the docs**: `/docs` folder has comprehensive guides
2. **Explore packages**: Each package has a `README.md`
3. **Check examples**: `/examples` folder has reference implementations
4. **Run tests**: `pnpm test` to understand the codebase
5. **Join discussions**: Check GitHub issues for architecture discussions

## Key Concepts

- **ATR** — Agent Threat Rules (Sigma-like detection rules for AI)
- **Threat Cloud** — Community intelligence service
- **Guard** — Real-time monitoring engine with SOAR playbooks
- **Skill** — Claude/MCP tool that can be audited
- **Finding** — Individual security issue detected during scan
- **Risk Score** — 0–100 composite threat level
- **MCP** — Model Context Protocol (Claude integration)

## Getting Help

1. **Check docs**: `/docs/ARCHITECTURE.md` explains system design
2. **Review comments**: Code is heavily documented
3. **Run tests**: Tests show expected behavior
4. **Ask questions**: Open a discussion in GitHub

---

**Ready to contribute?** Start with an open GitHub issue marked `good-first-issue`.

Happy hacking!
