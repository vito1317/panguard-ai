import * as vscode from 'vscode';
import { scanContent, type ScanResult, type ScanFinding } from '@panguard-ai/scan-core';
import { loadATRRules, type ATRRule } from '@panguard-ai/atr';

/**
 * Wrapper around the PanGuard scanning engine
 * Handles ATR rule loading and result conversion
 */
export class Scanner {
  private atrRules: ATRRule[] = [];
  private logger: vscode.OutputChannel;

  constructor(logger: vscode.OutputChannel) {
    this.logger = logger;
  }

  /**
   * Initialize the scanner by loading ATR rules
   */
  async initialize(): Promise<void> {
    try {
      this.atrRules = await loadATRRules();
      this.logger.appendLine(`Loaded ${this.atrRules.length} ATR rules`);
    } catch (error) {
      this.logger.appendLine(`Failed to load ATR rules: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Scan content and return findings
   * @param content The text content to scan
   * @param fileName The filename for context
   * @returns Scan result with findings
   */
  async scan(content: string, fileName: string): Promise<ScanResult> {
    if (this.atrRules.length === 0) {
      await this.initialize();
    }

    try {
      const result = await scanContent(content, {
        fileName,
        rules: this.atrRules,
      });

      return result;
    } catch (error) {
      this.logger.appendLine(`Scan error for ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get security score as a letter grade (A-F)
   */
  static getGrade(score: number): string {
    if (score >= 95) return 'A';
    if (score >= 85) return 'B';
    if (score >= 75) return 'C';
    if (score >= 65) return 'D';
    return 'F';
  }

  /**
   * Get color for security score
   */
  static getScoreColor(score: number): string {
    if (score >= 85) return '#22c55e'; // green
    if (score >= 70) return '#eab308'; // yellow
    if (score >= 50) return '#f97316'; // orange
    return '#ef4444'; // red
  }

  /**
   * Categorize findings by severity
   */
  static categorizeBySeverity(
    findings: ScanFinding[]
  ): Record<'critical' | 'high' | 'medium' | 'low' | 'info', ScanFinding[]> {
    return {
      critical: findings.filter((f) => f.severity === 'critical'),
      high: findings.filter((f) => f.severity === 'high'),
      medium: findings.filter((f) => f.severity === 'medium'),
      low: findings.filter((f) => f.severity === 'low'),
      info: findings.filter((f) => f.severity === 'info'),
    };
  }
}
