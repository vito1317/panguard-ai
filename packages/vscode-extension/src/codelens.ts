import * as vscode from 'vscode';
import { type ScanResult } from '@panguard-ai/scan-core';
import { Scanner } from './scanner';

/**
 * Provides CodeLens indicators for SKILL.md files
 * Shows security score badges and finding counts per section
 */
export class CodeLensProvider implements vscode.CodeLensProvider {
  private scanner: Scanner;
  private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
  public onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

  private cachedResults: Map<string, { result: ScanResult; timestamp: number }> = new Map();
  private cacheTimeout = 30000; // 30 seconds

  constructor(scanner: Scanner) {
    this.scanner = scanner;
  }

  async provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    if (!document.fileName.endsWith('SKILL.md')) {
      return [];
    }

    try {
      const result = await this.getScanResult(document);
      return this.createCodeLenses(document, result);
    } catch (error) {
      console.error('CodeLens error:', error);
      return [];
    }
  }

  /**
   * Get scan result with caching
   */
  private async getScanResult(document: vscode.TextDocument): Promise<ScanResult> {
    const cacheKey = document.uri.fsPath;
    const cached = this.cachedResults.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }

    const result = await this.scanner.scan(document.getText(), document.fileName);
    this.cachedResults.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  }

  /**
   * Create CodeLens entries from scan result
   */
  private createCodeLenses(document: vscode.TextDocument, result: ScanResult): vscode.CodeLens[] {
    const lenses: vscode.CodeLens[] = [];

    // Score badge at top of file
    const scorePosition = new vscode.Position(0, 0);
    const scoreRange = new vscode.Range(scorePosition, scorePosition);

    const grade = Scanner.getGrade(result.score);
    const scoreColor = Scanner.getScoreColor(result.score);

    const scoreLens = new vscode.CodeLens(scoreRange, {
      title: `PanGuard Security Score: ${grade} (${result.score}%)`,
      command: 'panguard.showDashboard',
      arguments: [document.uri],
    });
    lenses.push(scoreLens);

    // Finding summary
    const categorized = Scanner.categorizeBySeverity(result.findings);
    const findingCounts = [
      categorized.critical.length > 0 ? `Critical: ${categorized.critical.length}` : '',
      categorized.high.length > 0 ? `High: ${categorized.high.length}` : '',
      categorized.medium.length > 0 ? `Medium: ${categorized.medium.length}` : '',
    ]
      .filter((s) => s)
      .join(' | ');

    if (findingCounts) {
      const summaryLens = new vscode.CodeLens(scoreRange, {
        title: `Findings: ${findingCounts}`,
        command: 'panguard.showDashboard',
        arguments: [document.uri],
      });
      lenses.push(summaryLens);
    }

    // Section-specific lenses (look for common sections in SKILL.md)
    const sectionPatterns = [
      { pattern: /^## Description/m, name: 'Description' },
      { pattern: /^## What this skill does/m, name: 'Behavior' },
      { pattern: /^## Example/m, name: 'Example' },
      { pattern: /^## (Security|Privacy|Data)/m, name: 'Security Notes' },
    ];

    for (const { pattern, name } of sectionPatterns) {
      const match = document.getText().match(pattern);
      if (match && match.index !== undefined) {
        const matchLine = document.positionAt(match.index).line;
        const sectionLens = new vscode.CodeLens(
          new vscode.Range(new vscode.Position(matchLine, 0), new vscode.Position(matchLine, 0)),
          {
            title: `${name} - Click to scan this section`,
            command: 'panguard.scanFile',
          }
        );
        lenses.push(sectionLens);
      }
    }

    return lenses;
  }

  /**
   * Invalidate cache when document changes
   */
  invalidateCache(documentUri: vscode.Uri): void {
    this.cachedResults.delete(documentUri.fsPath);
    this.onDidChangeCodeLensesEmitter.fire();
  }
}
