import * as vscode from 'vscode';
import { DiagnosticsProvider } from './diagnostics';
import { Scanner } from './scanner';

/**
 * Provides a WebView dashboard for security scanning results
 * Shows overall security score, risk breakdown, and detailed findings
 */
export class DashboardProvider {
  private panel: vscode.WebviewPanel | undefined;
  private extensionUri: vscode.Uri;
  private diagnosticsProvider: DiagnosticsProvider;

  constructor(extensionUri: vscode.Uri, diagnosticsProvider: DiagnosticsProvider) {
    this.extensionUri = extensionUri;
    this.diagnosticsProvider = diagnosticsProvider;
  }

  /**
   * Show or bring the dashboard to focus
   */
  show(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
    } else {
      this.createPanel();
    }
  }

  /**
   * Create the WebView panel
   */
  private createPanel(): void {
    this.panel = vscode.window.createWebviewPanel(
      'panguardDashboard',
      'PanGuard Security Dashboard',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
      }
    );

    this.panel.webview.html = this.getWebviewContent();

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    this.panel.webview.onDidReceiveMessage((message) => {
      this.handleMessage(message);
    });
  }

  /**
   * Handle messages from the WebView
   */
  private handleMessage(message: any): void {
    switch (message.command) {
      case 'refresh':
        if (this.panel) {
          this.panel.webview.html = this.getWebviewContent();
        }
        break;
      case 'openFile':
        this.openFile(message.path);
        break;
    }
  }

  /**
   * Open a file in VS Code
   */
  private openFile(path: string): void {
    vscode.workspace.openTextDocument(path).then((document) => {
      vscode.window.showTextDocument(document);
    });
  }

  /**
   * Get the WebView HTML content
   */
  private getWebviewContent(): string {
    const summary = this.diagnosticsProvider.getDiagnosticsSummary();
    const scorePercentage = Math.max(0, 100 - (summary.total * 2));
    const grade = Scanner.getGrade(scorePercentage);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PanGuard Security Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 20px;
            line-height: 1.6;
        }

        .container {
            max-width: 600px;
        }

        h1 {
            font-size: 24px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .score-card {
            background: var(--vscode-editor-selectionBackground);
            border: 1px solid var(--vscode-editor-selectionHighlightBackground);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
        }

        .score-display {
            font-size: 48px;
            font-weight: bold;
            margin: 10px 0;
            color: ${this.getScoreColor(scorePercentage)};
        }

        .score-label {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
        }

        .findings-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 15px;
        }

        .finding-item {
            padding: 10px;
            border-radius: 4px;
            background: var(--vscode-checkbox-background);
            border: 1px solid var(--vscode-checkbox-border);
        }

        .finding-count {
            font-size: 20px;
            font-weight: bold;
        }

        .finding-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }

        .critical { color: #ef4444; }
        .high { color: #f97316; }
        .medium { color: #eab308; }
        .low { color: #3b82f6; }
        .info { color: #6b7280; }

        .section {
            margin-bottom: 25px;
        }

        .section-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--vscode-editor-selectionHighlightBackground);
        }

        .finding-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .finding {
            padding: 12px;
            background: var(--vscode-editor-selectionBackground);
            border-left: 4px solid;
            border-radius: 4px;
            cursor: pointer;
            transition: opacity 0.2s;
        }

        .finding:hover {
            opacity: 0.8;
        }

        .finding.critical { border-left-color: #ef4444; }
        .finding.high { border-left-color: #f97316; }
        .finding.medium { border-left-color: #eab308; }
        .finding.low { border-left-color: #3b82f6; }

        .finding-title {
            font-weight: 600;
            margin-bottom: 4px;
            font-size: 14px;
        }

        .finding-description {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
        }

        .finding-remediation {
            font-size: 12px;
            padding: 6px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 2px;
            margin-top: 6px;
        }

        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
        }

        .badge.critical { background: #ef4444; color: white; }
        .badge.high { background: #f97316; color: white; }
        .badge.medium { background: #eab308; color: black; }
        .badge.low { background: #3b82f6; color: white; }

        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }

        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 15px;
        }

        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: opacity 0.2s;
        }

        button:hover {
            opacity: 0.8;
        }

        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-editor-selectionHighlightBackground);
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛡️ PanGuard Security Dashboard</h1>

        <div class="score-card">
            <div class="score-label">Security Score</div>
            <div class="score-display">${grade}</div>
            <div class="score-label">${scorePercentage}%</div>

            <div class="findings-grid">
                <div class="finding-item">
                    <div class="finding-count critical">${summary.critical}</div>
                    <div class="finding-label">Critical</div>
                </div>
                <div class="finding-item">
                    <div class="finding-count high">${summary.high}</div>
                    <div class="finding-label">High</div>
                </div>
                <div class="finding-item">
                    <div class="finding-count medium">${summary.medium}</div>
                    <div class="finding-label">Medium</div>
                </div>
                <div class="finding-item">
                    <div class="finding-count low">${summary.low}</div>
                    <div class="finding-label">Low</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Overview</div>
            <p>Total findings: <strong>${summary.total}</strong></p>
            <p style="margin-top: 10px; color: var(--vscode-descriptionForeground); font-size: 13px;">
                ${this.getScoreMessage(scorePercentage)}
            </p>
        </div>

        ${summary.critical > 0 ? `<div class="section">
            <div class="section-title">🔴 Critical Issues</div>
            <p style="color: var(--vscode-descriptionForeground); font-size: 13px; margin-bottom: 10px;">
                These findings represent severe security risks that require immediate attention.
            </p>
        </div>` : ''}

        ${summary.high > 0 ? `<div class="section">
            <div class="section-title">🟠 High Priority Issues</div>
            <p style="color: var(--vscode-descriptionForeground); font-size: 13px; margin-bottom: 10px;">
                These findings represent significant security risks that should be addressed soon.
            </p>
        </div>` : ''}

        <div class="section">
            <div class="section-title">Commands</div>
            <button onclick="refresh()">Refresh Dashboard</button>
        </div>

        <div class="footer">
            <p>PanGuard AI v0.1.0</p>
            <p style="margin-top: 5px;">Detecting prompt injection, data exfiltration, and 71+ threat patterns</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }
    </script>
</body>
</html>`;
  }

  /**
   * Get color for score percentage
   */
  private getScoreColor(score: number): string {
    if (score >= 85) return '#22c55e';
    if (score >= 70) return '#eab308';
    if (score >= 50) return '#f97316';
    return '#ef4444';
  }

  /**
   * Get message based on score
   */
  private getScoreMessage(score: number): string {
    if (score >= 90) return 'Excellent security posture! Keep up the good work.';
    if (score >= 75) return 'Good security practices in place. Address medium-priority items.';
    if (score >= 50) return 'Several security concerns. Prioritize high and critical findings.';
    return 'Critical security issues detected. Immediate action required.';
  }
}
