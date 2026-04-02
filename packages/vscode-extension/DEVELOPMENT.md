# PanGuard AI VS Code Extension - Development Guide

## Project Structure

```
vscode-extension/
├── src/                          # Source TypeScript files
│   ├── extension.ts             # Main extension entry point
│   ├── scanner.ts               # Scanner wrapper around @panguard-ai/scan-core
│   ├── diagnostics.ts           # VS Code diagnostics provider
│   ├── codelens.ts              # CodeLens provider for inline indicators
│   ├── status-bar.ts            # Status bar widget
│   └── dashboard.ts             # WebView dashboard provider
├── media/                        # Extension assets (icons, images)
├── package.json                 # Extension manifest
├── tsconfig.json               # TypeScript configuration
├── README.md                    # User-facing documentation
├── CHANGELOG.md                 # Version history
├── DEVELOPMENT.md              # This file
└── .vscodeignore               # Files to exclude from package
```

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- VS Code 1.85.0 or later

### Installation

```bash
cd /sessions/inspiring-peaceful-sagan/mnt/panguard-ai/packages/vscode-extension
npm install
```

## Development

### Build Extension

```bash
npm run build          # One-time build
npm run watch         # Watch mode for development
npm run typecheck     # Type checking only
```

### Running the Extension

1. Open this folder in VS Code
2. Press `F5` to start debugging (requires `.vscode/launch.json`)
3. Extension runs in a new VS Code window

### Creating Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "preLaunchTask": "npm: watch"
    }
  ]
}
```

## Architecture

### Extension Lifecycle

1. **Activation** (`activate()` in `extension.ts`)
   - Loads ATR rules
   - Registers commands
   - Sets up file watchers
   - Scans open documents

2. **File Watching**
   - Watches for changes to `SKILL.md` files
   - Triggers auto-scan on save (if enabled)

3. **Scanning** (`scanner.ts`)
   - Uses `@panguard-ai/scan-core` for threat detection
   - Returns `ScanResult` with findings
   - Caches results for performance

4. **UI Updates**
   - Diagnostics: Problem markers in editor
   - CodeLens: Inline score badges
   - Status Bar: File-level score
   - Dashboard: WebView panel with details

### Module Responsibilities

#### `extension.ts`
- Extension activation/deactivation
- Command registration
- File watcher setup
- Coordinates all other modules

#### `scanner.ts`
- Wraps `@panguard-ai/scan-core`
- Loads and manages ATR rules
- Provides utility functions (grading, categorization)

#### `diagnostics.ts`
- Creates VS Code `Diagnostic` objects
- Maps PanGuard findings to editor issues
- Manages diagnostic collections
- Respects severity threshold setting

#### `codelens.ts`
- Implements `vscode.CodeLensProvider`
- Shows security score at file top
- Displays finding counts
- Provides quick access to dashboard

#### `status-bar.ts`
- Updates VS Code status bar
- Shows current file score
- Provides visual severity indicator
- Clicks open dashboard

#### `dashboard.ts`
- Creates WebView panel
- Renders HTML/CSS/JS dashboard
- Shows score, findings, statistics
- Communicates with extension via message passing

## Configuration

Users can configure behavior in VS Code settings:

```json
{
  "panguard.autoScan": true,              // Auto-scan on save
  "panguard.severityThreshold": "medium", // Min severity to show
  "panguard.showInlineHints": true        // Show remediation hints
}
```

Settings are defined in `package.json` under `contributes.configuration`.

## Type Safety

The extension uses TypeScript with strict mode. All types come from:
- `@panguard-ai/scan-core` - Core scanning types
- `@panguard-ai/atr` - ATR rules types
- `vscode` - VS Code API types

## Building for Release

### Package Extension

```bash
npm run package
# Creates: panguard-ai-0.1.0.vsix
```

### Update Version

1. Update `package.json` version
2. Update `CHANGELOG.md` with changes
3. Rebuild and package

### Publishing to Marketplace

```bash
vsce publish
# Requires vsce CLI and publisher token
```

## Testing

### Manual Testing

1. Open a folder with SKILL.md files
2. Verify diagnostics appear
3. Check CodeLens badges
4. View status bar widget
5. Open dashboard with `panguard.showDashboard`
6. Test commands with Ctrl+Shift+P

### Test Coverage Areas

- [ ] Auto-scan on file save
- [ ] Manual file scan
- [ ] Workspace scan
- [ ] Severity threshold filtering
- [ ] Dashboard rendering
- [ ] CodeLens display
- [ ] Status bar updates
- [ ] Configuration changes

## Debugging

### Enable Debug Logging

In `extension.ts`, the output channel logs to "PanGuard AI":

```typescript
logger.appendLine('Debug message');
```

View in VS Code: Output panel → "PanGuard AI"

### Common Issues

**Extension not activating:**
- Check workspace contains SKILL.md
- Verify activation events in package.json
- Check Output channel for errors

**Diagnostics not showing:**
- Verify severity threshold setting
- Check scanner initialization
- Ensure file is saved after changes

**Dashboard blank:**
- Check WebView security context
- Verify script execution enabled
- Check browser console for errors

## Performance Considerations

- **Caching**: CodeLens caches results for 30 seconds
- **Workspace Scans**: Shows progress bar, runs sequentially
- **File Watchers**: Only watches SKILL.md files
- **Async Operations**: All expensive operations are async

## Dependencies

### Runtime
- `@panguard-ai/scan-core` - Core scanning engine
- `@panguard-ai/atr` - Automated threat recognition rules
- `vscode` - VS Code API (external)

### Development
- `typescript` - Language
- `esbuild` - Bundler
- `@types/vscode` - VS Code types
- `@types/node` - Node types

## Contributing

### Code Style

- Use TypeScript strict mode
- Use async/await, not callbacks
- Document public methods with JSDoc
- Use meaningful variable names

### Adding New Features

1. Implement in appropriate module
2. Register in extension activation
3. Update package.json if needed
4. Add tests
5. Update README.md
6. Update CHANGELOG.md

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code UX Guidelines](https://code.visualstudio.com/api/ux-guidelines)
- [WebView Documentation](https://code.visualstudio.com/api/extension-guides/webview)
- [Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

## License

MIT
