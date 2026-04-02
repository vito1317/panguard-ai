#!/usr/bin/env tsx
/**
 * Debug scan utility — scan a SKILL.md and dump detailed results.
 *
 * Usage:
 *   npx tsx scripts/debug-scan.ts path/to/SKILL.md
 *   npx tsx scripts/debug-scan.ts --url https://github.com/user/repo
 *   echo "content" | npx tsx scripts/debug-scan.ts --stdin
 *
 * This tool scans SKILL.md files and dumps all intermediate results
 * from the scan-core engine including manifest parsing, context signals,
 * findings grouped by severity, risk breakdown, and timing information.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parseManifestFromString, scanContent, compileRules } from '@panguard-ai/scan-core';
import { globSync } from 'glob';

// ANSI color codes (no dependencies needed)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function header(title: string): void {
  console.log();
  console.log(colorize('═'.repeat(70), 'blue'));
  console.log(colorize(` ${title}`, 'bright'));
  console.log(colorize('═'.repeat(70), 'blue'));
}

function section(title: string): void {
  console.log();
  console.log(colorize(`▸ ${title}`, 'cyan'));
  console.log(colorize('─'.repeat(70), 'gray'));
}

function displayFinding(
  finding: any,
  level: 'critical' | 'high' | 'medium' | 'low' | 'info',
): void {
  const severityColor = {
    critical: 'red',
    high: 'red',
    medium: 'yellow',
    low: 'yellow',
    info: 'cyan',
  } as const;

  const icon = {
    critical: '✕',
    high: '✕',
    medium: '⚠',
    low: '◆',
    info: 'ℹ',
  };

  const color = severityColor[level];
  console.log(
    `  ${colorize(icon[level], color)} ${colorize(finding.title, color)} ${colorize(
      `(${finding.category})`,
      'gray',
    )}`,
  );

  if (finding.description) {
    const lines = finding.description.split('\n');
    for (const line of lines.slice(0, 2)) {
      console.log(`     ${line.substring(0, 65)}`);
    }
  }
  if (finding.location) {
    console.log(`     ${colorize(`📍 ${finding.location}`, 'gray')}`);
  }
  console.log();
}

async function loadATRRules(): Promise<any[]> {
  try {
    const rulesDir = resolve('./packages/atr/rules');
    if (!existsSync(rulesDir)) {
      console.warn(colorize('⚠ ATR rules directory not found at', 'yellow'), rulesDir);
      return [];
    }

    // Find all YAML rule files
    const ruleFiles = globSync(`${rulesDir}/**/*.yaml`);
    const rules = [];

    for (const file of ruleFiles) {
      try {
        // In production, parse YAML here
        // For now, log that we would load them
        rules.push({ file });
      } catch (e) {
        console.error(`Failed to load ${file}:`, (e as Error).message);
      }
    }

    console.log(colorize(`Loaded ${rules.length} ATR rule files`, 'gray'));
    return rules;
  } catch (e) {
    console.warn(colorize('⚠ Could not load ATR rules:', 'yellow'), (e as Error).message);
    return [];
  }
}

async function scanFile(filePath: string): Promise<void> {
  if (!existsSync(filePath)) {
    console.error(colorize(`✕ File not found: ${filePath}`, 'red'));
    process.exit(1);
  }

  const content = readFileSync(filePath, 'utf-8');
  const fileName = filePath.split('/').pop() || filePath;

  header(`SCANNING: ${colorize(fileName, 'bright')}`);

  const startTime = Date.now();

  // Parse manifest
  section('1. Manifest Parsing');
  const manifest = parseManifestFromString(content);

  if (manifest) {
    console.log(`${colorize('✓ Name:', 'green')} ${manifest.name}`);
    console.log(`${colorize('✓ Description:', 'green')} ${manifest.description.substring(0, 60)}...`);
    if (manifest['allowed-tools']) {
      console.log(
        `${colorize('✓ Allowed Tools:', 'green')} ${manifest['allowed-tools'].join(', ')}`,
      );
    }
    if (manifest.disableModelInvocation) {
      console.log(colorize('⚠ Model invocation DISABLED', 'yellow'));
    }
  } else {
    console.log(colorize('⚠ No valid manifest found', 'yellow'));
  }

  // Scan content
  section('2. Scanning Content');
  const atrRules = await loadATRRules();
  const scanResult = await scanContent(content, {
    sourceType: 'skill',
    skillName: manifest?.name,
  });

  console.log(`${colorize('ATR Rules Evaluated:', 'cyan')} ${scanResult.atrRulesEvaluated}`);
  console.log(`${colorize('ATR Patterns Matched:', 'cyan')} ${scanResult.atrPatternsMatched}`);

  // Context signals
  section('3. Context Signals');
  if (scanResult.contextSignals.signals.length > 0) {
    console.log(colorize(`Multiplier: ${scanResult.contextSignals.multiplier.toFixed(2)}x`, 'cyan'));
    for (const signal of scanResult.contextSignals.signals) {
      const type = signal.type === 'booster' ? '📈' : '📉';
      const color = signal.type === 'booster' ? 'red' : 'green';
      console.log(
        `  ${type} ${colorize(signal.label, color)} (weight: ${signal.weight.toFixed(2)})`,
      );
    }
  } else {
    console.log(colorize('No signals detected', 'gray'));
  }

  // Findings summary
  section('4. Findings Summary');
  const bySeverity: Record<string, any[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    info: [],
  };

  for (const finding of scanResult.findings) {
    const severity = (finding.severity as keyof typeof bySeverity) || 'info';
    bySeverity[severity].push(finding);
  }

  const counts = {
    critical: bySeverity.critical.length,
    high: bySeverity.high.length,
    medium: bySeverity.medium.length,
    low: bySeverity.low.length,
    info: bySeverity.info.length,
  };

  const summary = [
    counts.critical > 0 ? colorize(`${counts.critical} critical`, 'red') : '',
    counts.high > 0 ? colorize(`${counts.high} high`, 'red') : '',
    counts.medium > 0 ? colorize(`${counts.medium} medium`, 'yellow') : '',
    counts.low > 0 ? colorize(`${counts.low} low`, 'yellow') : '',
    counts.info > 0 ? colorize(`${counts.info} info`, 'cyan') : '',
  ]
    .filter(Boolean)
    .join(', ');

  console.log(`Total: ${summary}`);

  // Critical findings
  if (bySeverity.critical.length > 0) {
    section('Critical Findings');
    for (const finding of bySeverity.critical) {
      displayFinding(finding, 'critical');
    }
  }

  // High findings
  if (bySeverity.high.length > 0) {
    section('High Severity Findings');
    for (const finding of bySeverity.high) {
      displayFinding(finding, 'high');
    }
  }

  // Medium findings
  if (bySeverity.medium.length > 0) {
    section('Medium Severity Findings');
    for (const finding of bySeverity.medium.slice(0, 5)) {
      displayFinding(finding, 'medium');
    }
    if (bySeverity.medium.length > 5) {
      console.log(colorize(`... and ${bySeverity.medium.length - 5} more`, 'gray'));
    }
  }

  // Risk score breakdown
  section('5. Risk Score');
  const baseScore = Math.min(
    100,
    bySeverity.critical.length * 25 +
      bySeverity.high.length * 15 +
      bySeverity.medium.length * 5 +
      bySeverity.low.length * 1,
  );
  const finalScore = Math.min(100, baseScore * scanResult.contextSignals.multiplier);

  const riskColor =
    scanResult.riskLevel === 'CRITICAL'
      ? 'red'
      : scanResult.riskLevel === 'HIGH'
        ? 'red'
        : scanResult.riskLevel === 'MEDIUM'
          ? 'yellow'
          : 'green';

  console.log(`${colorize('Risk Level:', 'cyan')} ${colorize(scanResult.riskLevel, riskColor)}`);
  console.log(
    `${colorize('Risk Score:', 'cyan')} ${colorize(finalScore.toFixed(0), riskColor)} / 100`,
  );
  console.log(`${colorize('Base Score:', 'cyan')} ${baseScore.toFixed(0)}`);
  console.log(`${colorize('Signal Multiplier:', 'cyan')} ${scanResult.contextSignals.multiplier.toFixed(2)}x`);

  // Check results
  section('6. Check Results');
  for (const check of scanResult.checks) {
    const statusIcon =
      check.status === 'pass'
        ? '✓'
        : check.status === 'fail'
          ? '✕'
          : check.status === 'warn'
            ? '⚠'
            : 'ℹ';
    const statusColor =
      check.status === 'pass' ? 'green' : check.status === 'fail' ? 'red' : 'yellow';

    console.log(`  ${colorize(statusIcon, statusColor)} ${check.label}`);
    const findingCount = check.findings?.length || 0;
    if (findingCount > 0) {
      console.log(`     ${findingCount} finding${findingCount !== 1 ? 's' : ''}`);
    }
  }

  // Timing
  section('7. Performance');
  const elapsed = Date.now() - startTime;
  console.log(`${colorize('Total Time:', 'cyan')} ${elapsed}ms`);
  console.log(`${colorize('Content Hash:', 'gray')} ${scanResult.contentHash.substring(0, 16)}...`);
  console.log(`${colorize('Pattern Hash:', 'gray')} ${scanResult.patternHash.substring(0, 16)}...`);

  // Exit code based on risk level
  header('COMPLETE');
  const exitCode = scanResult.riskLevel === 'HIGH' || scanResult.riskLevel === 'CRITICAL' ? 1 : 0;
  console.log(
    `Exit code: ${colorize(exitCode.toString(), exitCode === 0 ? 'green' : 'red')} (${
      exitCode === 0 ? 'safe' : 'threats detected'
    })`,
  );

  process.exit(exitCode);
}

// Main
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
${colorize('debug-scan', 'bright')} — Scan SKILL.md and dump detailed results

${colorize('USAGE', 'cyan')}
  npx tsx scripts/debug-scan.ts <file|--url|--stdin>

${colorize('EXAMPLES', 'cyan')}
  npx tsx scripts/debug-scan.ts ./SKILL.md
  npx tsx scripts/debug-scan.ts --url https://github.com/org/skill
  echo "SKILL.md content" | npx tsx scripts/debug-scan.ts --stdin

${colorize('OPTIONS', 'cyan')}
  <file>       Path to SKILL.md file
  --url URL    GitHub or public URL to skill
  --stdin      Read from stdin
  -h, --help   Show this help
    `);
    process.exit(0);
  }

  if (args[0] === '--stdin') {
    // Read from stdin (not implemented - requires async stdin handling)
    console.error(colorize('--stdin mode not yet implemented', 'yellow'));
    console.log('Please pass a file path or use --url instead');
    process.exit(1);
  }

  if (args[0] === '--url') {
    // URL mode (not implemented - would require git clone)
    console.error(colorize('--url mode not yet implemented', 'yellow'));
    console.log('Please pass a local file path instead');
    process.exit(1);
  }

  // File mode
  const filePath = resolve(args[0]);
  await scanFile(filePath);
}

main().catch((err) => {
  console.error(colorize(`✕ Error: ${(err as Error).message}`, 'red'));
  process.exit(1);
});
