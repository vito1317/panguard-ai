# PanGuard MCP Skill Audit GitHub Action

Comprehensive security audit for Model Context Protocol (MCP) skills with GitHub integration, SARIF support, and detailed reporting.

![Status Badge](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-blue)
![GitHub](https://img.shields.io/badge/github-panguard--ai-black?logo=github)

## Overview

PanGuard is an automated security audit tool for MCP (Model Context Protocol) skills. This GitHub Action integrates PanGuard directly into your CI/CD pipeline to:

- Scan MCP skill configurations for security vulnerabilities
- Provide detailed findings with severity levels
- Generate GitHub Code Scanning SARIF reports
- Post structured PR comments with findings
- Create inline annotations on affected files
- Generate job summaries for visibility
- Support scheduled and on-demand scans

## Quick Start

### Basic Usage

Add to `.github/workflows/panguard-audit.yml`:

```yaml
name: PanGuard Skill Audit

on:
  pull_request:
    paths:
      - '**/claude_desktop_config.json'
      - '**/.cursor/mcp.json'
      - '**/mcp.json'
      - '**/.mcp.json'
      - '**/.windsurf/mcp.json'
      - '**/.cline/mcp_settings.json'
      - '**/SKILL.md'

permissions:
  pull-requests: write
  contents: read

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - uses: panguard-ai/panguard-guard/github-action@main
        with:
          fail-on-high: 'true'
          comment-on-pr: 'true'
```

### Advanced Usage with SARIF

```yaml
- uses: panguard-ai/panguard-guard/github-action@main
  with:
    fail-on-high: 'true'
    comment-on-pr: 'true'
    severity-threshold: 'MEDIUM'
    max-findings: '100'
    sarif-output: 'true'
    scan-args: '--verbose'
```

## Inputs

### Core Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `fail-on-high` | Fail the workflow if HIGH or CRITICAL findings are detected | No | `'true'` |
| `comment-on-pr` | Post audit results as a PR comment | No | `'true'` |
| `scan-args` | Additional arguments to pass to panguard-guard scan | No | `''` |

### Advanced Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `severity-threshold` | Minimum severity level to report (LOW, MEDIUM, HIGH, CRITICAL) | No | `'HIGH'` |
| `max-findings` | Maximum number of findings to display in reports | No | `'50'` |
| `sarif-output` | Generate and upload SARIF report to GitHub Code Scanning | No | `'false'` |
| `github-token` | GitHub token for uploading SARIF results | No | (uses github.token) |

## Outputs

| Output | Description |
|--------|-------------|
| `highest-risk` | Highest risk level found (CLEAN, LOW, MEDIUM, HIGH, CRITICAL) |
| `total-findings` | Total number of findings detected |
| `report-json` | Path to full scan report JSON file |
| `sarif-file` | Path to generated SARIF report (if enabled) |
| `scan-status` | Overall scan status (PASSED, WARNING, FAILED) |

## Features

### PR Comments

Automatically posts detailed comments on PRs with:
- Risk level badge and status indicator
- Collapsible sections for each skill's findings
- Links to PanGuard documentation
- Summary of findings per skill

Example:
```
## ✅ PanGuard MCP Skill Audit — All Clear

**Highest Risk:** CLEAN | **Total Findings:** 0

### Audit Results

<details><summary>🟢 my-skill — CLEAN (0 findings)</summary>

No issues detected.

</details>

---

**Learn More:** [PanGuard Documentation](https://docs.panguard.ai) | [GitHub Repository](https://github.com/panguard-ai/panguard-guard)
```

### Job Summary

Generates a summary table in the job summary:

| Skill | Risk Level | Findings | Status |
|-------|-----------|----------|--------|
| my-skill | 🟢 LOW | 2 | scanned |
| payment-processor | 🟠 HIGH | 5 | scanned |

### Inline Annotations

Adds inline annotations on affected files:

```
::error file=SKILL.md,line=15,title=Insecure API Call::[my-skill] Credentials hardcoded in configuration
::warning file=SKILL.md,line=23,title=Missing Input Validation::[my-skill] User input not validated before API call
```

### SARIF Code Scanning Integration

Enables GitHub's Code Scanning dashboard with:
- Structured security findings
- Severity levels mapped to SARIF levels
- File locations and line numbers
- Rule metadata and remediation guidance

## Examples

### Scheduled Scanning

Run daily audits of all MCP skills:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:

jobs:
  scheduled-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: panguard-ai/panguard-guard/github-action@main
        with:
          sarif-output: 'true'
          comment-on-pr: 'false'
```

### Matrix Strategy

Audit multiple MCP client configurations:

```yaml
strategy:
  matrix:
    client: [claude, cursor, windsurf, cline]
    include:
      - client: claude
        config-path: 'claude_desktop_config.json'
      - client: cursor
        config-path: '.cursor/mcp.json'

steps:
  - uses: panguard-ai/panguard-guard/github-action@main
    with:
      scan-args: '--config ${{ matrix.config-path }}'
```

### Using Outputs

Access audit results in subsequent steps:

```yaml
- name: Run audit
  id: panguard
  uses: panguard-ai/panguard-guard/github-action@main
  with:
    fail-on-high: 'false'

- name: Handle findings
  run: |
    echo "Status: ${{ steps.panguard.outputs.scan-status }}"
    echo "Risk: ${{ steps.panguard.outputs.highest-risk }}"
    echo "Findings: ${{ steps.panguard.outputs.total-findings }}"
```

### Branch-Specific Enforcement

Different audit rules for different branches:

```yaml
- name: Strict audit for main
  if: github.base_ref == 'main'
  uses: panguard-ai/panguard-guard/github-action@main
  with:
    fail-on-high: 'true'
    severity-threshold: 'MEDIUM'

- name: Standard audit for develop
  if: github.base_ref == 'develop'
  uses: panguard-ai/panguard-guard/github-action@main
  with:
    fail-on-high: 'false'
    severity-threshold: 'HIGH'
```

## Configuration

### Severity Levels

PanGuard uses these severity levels:

- **CRITICAL**: Immediate security threat requiring action
- **HIGH**: Significant security issue requiring attention
- **MEDIUM**: Potential security concern
- **LOW**: Minor security observation
- **INFO**: Informational finding

### MCP Config File Detection

The action automatically detects changes to:

- `claude_desktop_config.json`
- `.cursor/mcp.json`
- `mcp.json`
- `.mcp.json`
- `.windsurf/mcp.json`
- `.cline/mcp_settings.json`
- `SKILL.md` (skill definitions)

## Permissions Required

```yaml
permissions:
  pull-requests: write    # For PR comments
  contents: read          # For scanning repo
  security-events: write  # For SARIF upload (if enabled)
```

## SARIF Format

When `sarif-output: 'true'` is set, the action:

1. Generates a SARIF 2.1.0 format report
2. Maps PanGuard severity to SARIF levels:
   - CRITICAL, HIGH → error
   - MEDIUM → warning
   - LOW, INFO → note
3. Uploads to GitHub Code Scanning via `github/codeql-action/upload-sarif@v3`
4. Makes findings visible in the Security tab

## Integration with Other Tools

PanGuard works well with other security scanners. Example with Trivy:

```yaml
- uses: panguard-ai/panguard-guard/github-action@main
  id: panguard
  with:
    sarif-output: 'true'

- uses: aquasecurity/trivy-action@master
  with:
    format: 'sarif'
    output: 'trivy.sarif'

- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: 'trivy.sarif'
```

## Troubleshooting

### Action not triggering

Ensure the workflow file includes the correct trigger paths:

```yaml
on:
  pull_request:
    paths:
      - '**/SKILL.md'
      - '**/mcp.json'
```

### SARIF upload fails

Verify the workflow has `security-events: write` permission:

```yaml
permissions:
  security-events: write
```

### No findings detected

- Verify MCP config files are properly formatted JSON
- Check that skills are in the correct locations
- Run with `scan-args: '--verbose'` for detailed output

### PR comment not appearing

Ensure workflow has `pull-requests: write` permission and is running on a pull request event.

## Environment

- Requires Node.js 20+
- Python 3.7+ for SARIF conversion
- Ubuntu Latest or compatible Linux environment

## Support

For issues, feature requests, or documentation:

- Documentation: https://docs.panguard.ai
- GitHub Issues: https://github.com/panguard-ai/panguard-guard/issues
- Repository: https://github.com/panguard-ai/panguard-guard

## License

MIT License - See LICENSE file for details

## Security

For security vulnerabilities in PanGuard itself, please report to security@panguard.ai

---

**Made by PanGuard AI** - Securing Model Context Protocol skills
