/**
 * Lazy loader for ATR rules.
 * Rules are compiled once on first access, then cached.
 * Supports both synchronous reads (returns empty if not yet loaded)
 * and async loading with deduplication (only one compilation in flight).
 */
import type { CompiledRule } from './types.js';

let _compiledRules: readonly CompiledRule[] | null = null;
let _compilePromise: Promise<readonly CompiledRule[]> | null = null;

/**
 * Get compiled rules synchronously.
 * Returns empty array if rules haven't been loaded yet.
 */
export function getCompiledRules(): readonly CompiledRule[] {
  if (_compiledRules) return _compiledRules;
  // Synchronous fallback: rules not yet loaded
  return [];
}

/**
 * Asynchronously load and compile ATR rules.
 * Deduplicates concurrent calls to avoid redundant compilation.
 *
 * @param rulesPath - Optional path to custom rules file. If omitted, uses default.
 * @returns Promise resolving to compiled rules
 */
export async function loadCompiledRules(rulesPath?: string): Promise<readonly CompiledRule[]> {
  // Already loaded
  if (_compiledRules) return _compiledRules;

  // Compilation in flight: return existing promise
  if (_compilePromise) return _compilePromise;

  // Start new compilation
  _compilePromise = (async () => {
    try {
      // Dynamically import to avoid circular dependencies
      const { compileRules } = await import('./atr-engine.js');

      // TODO: Implement actual rule loading from file system or default rules
      // For now, compile empty array (consumers can provide rules via ScanOptions)
      const rules = rulesPath
        ? [] // Would load from rulesPath
        : [];

      _compiledRules = await compileRules(rules);
      return _compiledRules;
    } catch (err) {
      // Clear promise on error so retry is possible
      _compilePromise = null;
      throw err;
    }
  })();

  return _compilePromise;
}

/**
 * Clear the compiled rules cache.
 * Useful for testing or reloading rules.
 */
export function clearCompiledRulesCache(): void {
  _compiledRules = null;
  _compilePromise = null;
}
