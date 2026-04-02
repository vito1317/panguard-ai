# PanGuard AI - MCP Skill Security Scanner

Real-time security scanning for MCP skills directly in VS Code. Detects prompt injection, data exfiltration, and 71+ threat patterns with instant feedback.

## Features

- **Real-Time Security Scanning**: Automatically scans `SKILL.md` files as you edit them
- **Comprehensive Threat Detection**: Identifies 71+ security threat patterns including:
  - Prompt injection attempts
  - Data exfiltration risks
  - Unsafe file operations
  - Information disclosure vulnerabilities
  - Credential handling issues
  - Privilege escalation patterns

- **Severity-Based Diagnostics**: Color-coded findings (Critical, High, Medium, Low, Info)
- **Security Dashboard**: Detailed visualization of security scores and findings
- **CodeLens Integration**: Inline security score badges and finding counts
- **Status Bar Widget**: Quick overview of current file's security posture
- **Workspace Scanning**: Batch scan all SKILL.md files in your workspace
- **Configurable Thresholds**: Set minimum severity levels to display

## Installation

1. Install from the VS Code Marketplace (search for "PanGuard AI")
2. Or build from source:
   ```bash
   npm install
   npm run build
   npm run package  # Creates .vsix file
   ```

## Quick Start

1. Open a folder containing `SKILL.md` files
2. The extension activates automatically
3. View security issues as red underlines in your SKILL.md files
4. Click the score badge to view the security dashboard

## Commands

- **PanGuard: Scan Current File** (`panguard.scanFile`)
  - Manually scan the active editor
  - Shortcut: `Ctrl+Shift+P` → type "PanGuard: Scan"

- **PanGuard: Scan All Skills in Workspace** (`panguard.scanWorkspace`)
  - Scan all SKILL.md files in the workspace
  - Shows progress and summary

- **PanGuard: Show Security Dashboard** (`panguard.showDashboard`)
  - Open the detailed security dashboard
  - Click the status bar item for quick access

## Configuration

Configure PanGuard in VS Code settings:

```json
{
  "panguard.autoScan": true,
  "panguard.severityThreshold": "medium",
  "panguard.showInlineHints": true
}
```

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `panguard.autoScan` | boolean | `true` | Auto-scan SKILL.md files when saved |
| `panguard.severityThreshold` | string | `"medium"` | Minimum severity to show (info, low, medium, high, critical) |
| `panguard.showInlineHints` | boolean | `true` | Show inline security hints and remediation suggestions |

## How It Works

1. **Detection Engine**: Scans content against 71+ threat patterns using the PanGuard ATR (Automated Threat Recognition) rules
2. **Real-Time Analysis**: Triggered on file open, edit, and save
3. **Intelligent Caching**: Reduces scan overhead while maintaining freshness
4. **Contextual Feedback**: Provides specific remediation guidance for each finding

## Understanding Severity Levels

- **Critical (🔴)**: Severe vulnerabilities requiring immediate action
- **High (🟠)**: Significant security risks that should be addressed soon
- **Medium (🟡)**: Notable security concerns worth investigating
- **Low (🔵)**: Minor issues or security best practices
- **Info (⚪)**: Informational findings for awareness

## Security Score Calculation

Security scores are calculated based on:
- Number and severity of findings
- Risk categories covered
- Overall compliance with security guidelines

Scores range from 0-100 and are displayed as letter grades (A-F):
- **A**: 95-100 (Excellent)
- **B**: 85-94 (Good)
- **C**: 75-84 (Fair)
- **D**: 65-74 (Poor)
- **F**: Below 65 (Critical)

## Examples

### Example SKILL.md with Security Issues

```markdown
# My Skill

## Description
This skill interacts with external APIs and handles user data.

## What this skill does
- Calls APIs with user credentials
- Logs all interactions to console
- Stores temporary files without cleanup
```

PanGuard would flag:
- Credential exposure (High)
- Insufficient data protection (Medium)
- Resource cleanup issues (Low)

## Troubleshooting

### Extension not activating
- Ensure you have a `SKILL.md` file or MCP configuration in your workspace
- Check the "PanGuard AI" output channel for error messages

### Slow scanning
- Check your workspace size with "PanGuard: Scan All Skills"
- Configure `panguard.severityThreshold` to reduce noise

### False positives
- PanGuard errs on the side of caution. Review findings context in the dashboard
- Submit false positive reports with your SKILL.md content

## Contributing

Found a security pattern we should detect? Have suggestions? Visit the [PanGuard GitHub repository](https://github.com/panguard-ai/panguard-ai).

## License

MIT - See LICENSE file for details

## Privacy

PanGuard AI only scans files in your local workspace. No data is sent to external servers.

---

**Stay secure. Scan smarter. Build safer AI agents.**

For updates and announcements, follow [@PanGuardAI](https://twitter.com/panguardai)
