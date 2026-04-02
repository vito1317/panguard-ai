import * as vscode from 'vscode';
import { type ScanResult } from '@panguard-ai/scan-core';
import { Scanner } from './scanner';

/**
 * Manages status bar integration for PanGuard security scores
 * Shows current file's security score in the VS Code status bar
 */
export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private currentScore: number | null = null;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      'panguard.status',
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'panguard.showDashboard';
    this.statusBarItem.show();
  }

  /**
   * Update status bar with new scan result
   */
  updateStatus(result: ScanResult): void {
    this.currentScore = result.score;

    const grade = Scanner.getGrade(result.score);
    const severity = this.getSeverityEmoji(result.score);

    // Count critical/high findings
    const criticalCount = result.findings.filter((f) => f.severity === 'critical').length;
    const highCount = result.findings.filter((f) => f.severity === 'high').length;

    let tooltip = `PanGuard Security Score: ${grade} (${result.score}%)\n\n`;
    tooltip += `Total Findings: ${result.findings.length}\n`;
    tooltip += `Critical: ${criticalCount}\n`;
    tooltip += `High: ${highCount}\n`;
    tooltip += `Medium: ${result.findings.filter((f) => f.severity === 'medium').length}\n`;
    tooltip += `\nClick to view dashboard`;

    this.statusBarItem.text = `$(shield) ${grade} (${result.score}%) ${severity}`;
    this.statusBarItem.tooltip = new vscode.MarkdownString(tooltip);
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarBackground');
  }

  /**
   * Reset status bar
   */
  reset(): void {
    this.statusBarItem.text = '$(shield) PanGuard';
    this.statusBarItem.tooltip = 'PanGuard AI - Click to scan';
    this.currentScore = null;
  }

  /**
   * Show scanning indicator
   */
  setScanning(): void {
    this.statusBarItem.text = '$(loading~spin) PanGuard Scanning...';
  }

  /**
   * Get emoji severity indicator
   */
  private getSeverityEmoji(score: number): string {
    if (score >= 85) return '✅';
    if (score >= 70) return '⚠️';
    if (score >= 50) return '🔶';
    return '🔴';
  }

  /**
   * Dispose status bar item
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}
