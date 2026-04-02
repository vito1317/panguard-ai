import * as vscode from 'vscode';
import { Scanner } from './scanner';
import { DiagnosticsProvider } from './diagnostics';
import { CodeLensProvider } from './codelens';
import { StatusBarManager } from './status-bar';
import { DashboardProvider } from './dashboard';

let scanner: Scanner;
let diagnosticsProvider: DiagnosticsProvider;
let statusBarManager: StatusBarManager;
let fileWatcher: vscode.FileSystemWatcher | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const logger = vscode.window.createOutputChannel('PanGuard AI');
  logger.appendLine('Activating PanGuard AI extension...');

  try {
    // Initialize scanner
    scanner = new Scanner(logger);
    await scanner.initialize();

    // Initialize diagnostics provider
    diagnosticsProvider = new DiagnosticsProvider();

    // Initialize status bar manager
    statusBarManager = new StatusBarManager();

    // Register commands
    registerCommands(context, logger);

    // Register CodeLens provider
    const codeLensProvider = new CodeLensProvider(scanner);
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(
        { language: 'markdown', pattern: '**/SKILL.md' },
        codeLensProvider
      )
    );

    // Setup file watchers for auto-scan
    setupFileWatchers(context, logger);

    // Scan open documents on activation
    scanOpenDocuments(logger);

    logger.appendLine('PanGuard AI extension activated successfully');
  } catch (error) {
    logger.appendLine(`Failed to activate extension: ${error instanceof Error ? error.message : String(error)}`);
    vscode.window.showErrorMessage(
      'PanGuard AI failed to activate. Check the output channel for details.'
    );
  }
}

export function deactivate(): void {
  if (fileWatcher) {
    fileWatcher.dispose();
  }
}

function registerCommands(context: vscode.ExtensionContext, logger: vscode.OutputChannel): void {
  // Scan current file
  context.subscriptions.push(
    vscode.commands.registerCommand('panguard.scanFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      await scanFile(editor.document, logger);
    })
  );

  // Scan workspace
  context.subscriptions.push(
    vscode.commands.registerCommand('panguard.scanWorkspace', async () => {
      await scanWorkspace(logger);
    })
  );

  // Show dashboard
  context.subscriptions.push(
    vscode.commands.registerCommand('panguard.showDashboard', () => {
      const dashboardProvider = new DashboardProvider(context.extensionUri, diagnosticsProvider);
      dashboardProvider.show();
    })
  );
}

function setupFileWatchers(context: vscode.ExtensionContext, logger: vscode.OutputChannel): void {
  // Watch for SKILL.md files
  fileWatcher = vscode.workspace.createFileSystemWatcher('**/SKILL.md');

  fileWatcher.onDidChange((uri) => {
    const document = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath === uri.fsPath);
    if (document) {
      const autoScan = vscode.workspace
        .getConfiguration('panguard')
        .get<boolean>('autoScan', true);

      if (autoScan) {
        scanFile(document, logger);
      }
    }
  });

  fileWatcher.onDidCreate((uri) => {
    const document = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath === uri.fsPath);
    if (document) {
      scanFile(document, logger);
    }
  });

  context.subscriptions.push(fileWatcher);
}

async function scanFile(document: vscode.TextDocument, logger: vscode.OutputChannel): Promise<void> {
  if (!document.fileName.endsWith('SKILL.md')) {
    return;
  }

  try {
    const content = document.getText();
    const result = await scanner.scan(content, document.uri.fsPath);

    // Update diagnostics
    diagnosticsProvider.updateDiagnostics(document, result);

    // Update status bar
    statusBarManager.updateStatus(result);

    logger.appendLine(`Scanned ${document.fileName}: ${result.findings.length} findings`);
  } catch (error) {
    logger.appendLine(`Error scanning file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function scanWorkspace(logger: vscode.OutputChannel): Promise<void> {
  try {
    const files = await vscode.workspace.findFiles('**/SKILL.md');

    if (files.length === 0) {
      vscode.window.showInformationMessage('No SKILL.md files found in workspace');
      return;
    }

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `PanGuard: Scanning ${files.length} SKILL.md files...`,
        cancellable: false,
      },
      async (progress) => {
        let scannedCount = 0;

        for (const uri of files) {
          const document = await vscode.workspace.openTextDocument(uri);
          await scanFile(document, logger);

          scannedCount++;
          progress.report({ increment: (100 / files.length) });
        }

        vscode.window.showInformationMessage(`PanGuard: Scanned ${scannedCount} files`);
      }
    );
  } catch (error) {
    logger.appendLine(`Error scanning workspace: ${error instanceof Error ? error.message : String(error)}`);
    vscode.window.showErrorMessage(
      `PanGuard workspace scan failed: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}

async function scanOpenDocuments(logger: vscode.OutputChannel): Promise<void> {
  for (const document of vscode.workspace.textDocuments) {
    if (document.fileName.endsWith('SKILL.md')) {
      await scanFile(document, logger);
    }
  }
}
