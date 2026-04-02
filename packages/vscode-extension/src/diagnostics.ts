import * as vscode from 'vscode';
import { type ScanResult, type ScanFinding } from '@panguard-ai/scan-core';

/**
 * Manages VS Code diagnostics from PanGuard scan results
 */
export class DiagnosticsProvider {
  private diagnosticCollections: Map<string, vscode.DiagnosticCollection> = new Map();

  /**
   * Update diagnostics for a document based on scan result
   */
  updateDiagnostics(document: vscode.TextDocument, result: ScanResult): void {
    const diagnostics: vscode.Diagnostic[] = [];
    const severityThreshold = vscode.workspace
      .getConfiguration('panguard')
      .get<string>('severityThreshold', 'medium');

    const severityOrder = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
    const thresholdLevel = severityOrder[severityThreshold as keyof typeof severityOrder] || 2;

    for (const finding of result.findings) {
      const findingSeverityLevel = severityOrder[finding.severity as keyof typeof severityOrder] || 0;

      // Only include findings that meet the severity threshold
      if (findingSeverityLevel < thresholdLevel) {
        continue;
      }

      const diagnostic = this.createDiagnostic(document, finding);
      if (diagnostic) {
        diagnostics.push(diagnostic);
      }
    }

    // Get or create collection for this file
    const collectionKey = document.uri.fsPath;
    let collection = this.diagnosticCollections.get(collectionKey);

    if (!collection) {
      collection = vscode.languages.createDiagnosticCollection(`panguard-${collectionKey}`);
      this.diagnosticCollections.set(collectionKey, collection);
    }

    collection.set(document.uri, diagnostics);
  }

  /**
   * Clear diagnostics for a document
   */
  clearDiagnostics(document: vscode.TextDocument): void {
    const collectionKey = document.uri.fsPath;
    const collection = this.diagnosticCollections.get(collectionKey);

    if (collection) {
      collection.clear();
    }
  }

  /**
   * Create a VS Code Diagnostic from a PanGuard finding
   */
  private createDiagnostic(document: vscode.TextDocument, finding: ScanFinding): vscode.Diagnostic | null {
    // Default to full document range if line/column info not available
    let range: vscode.Range;

    if (finding.location?.line !== undefined && finding.location?.column !== undefined) {
      const line = finding.location.line;
      const column = finding.location.column;

      // VS Code uses 0-based indexing
      range = new vscode.Range(new vscode.Position(line, column), new vscode.Position(line, column + 1));
    } else if (finding.location?.line !== undefined) {
      const line = finding.location.line;
      const lineText = document.lineAt(line).text;
      range = new vscode.Range(
        new vscode.Position(line, 0),
        new vscode.Position(line, lineText.length)
      );
    } else {
      // Default to first line
      range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1));
    }

    const severity = this.mapSeverity(finding.severity);
    const diagnostic = new vscode.Diagnostic(
      range,
      `${finding.title}: ${finding.description}`,
      severity
    );

    diagnostic.source = 'PanGuard';
    diagnostic.code = finding.id;

    // Add related information
    if (finding.remediation) {
      diagnostic.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(
          new vscode.Location(document.uri, range),
          `Fix: ${finding.remediation}`
        ),
      ];
    }

    // Add tags for quick identification
    if (finding.severity === 'critical' || finding.severity === 'high') {
      diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
    }

    return diagnostic;
  }

  /**
   * Map PanGuard severity levels to VS Code DiagnosticSeverity
   */
  private mapSeverity(severity: string): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'critical':
        return vscode.DiagnosticSeverity.Error;
      case 'high':
        return vscode.DiagnosticSeverity.Error;
      case 'medium':
        return vscode.DiagnosticSeverity.Warning;
      case 'low':
        return vscode.DiagnosticSeverity.Information;
      case 'info':
      default:
        return vscode.DiagnosticSeverity.Hint;
    }
  }

  /**
   * Get current diagnostics summary
   */
  getDiagnosticsSummary(): {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  } {
    const summary = {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const collection of this.diagnosticCollections.values()) {
      for (const [_, diagnostics] of collection) {
        for (const diag of diagnostics) {
          summary.total++;

          // Extract severity from diagnostic code if available
          const source = diag.source || '';
          if (source.includes('critical')) {
            summary.critical++;
          } else if (source.includes('high')) {
            summary.high++;
          } else if (source.includes('medium')) {
            summary.medium++;
          } else if (source.includes('low')) {
            summary.low++;
          } else {
            summary.info++;
          }
        }
      }
    }

    return summary;
  }

  /**
   * Dispose all diagnostic collections
   */
  dispose(): void {
    for (const collection of this.diagnosticCollections.values()) {
      collection.dispose();
    }
    this.diagnosticCollections.clear();
  }
}
