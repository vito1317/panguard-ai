/**
 * Cached wrapper for scanContent() with LRU deduplication.
 * Same content + same options = instant cache hit.
 */
import { scanContent } from './scanner.js';
import { LRUCache } from './cache.js';
import { contentHash } from './hash-utils.js';
import type { ScanOptions, ScanResult } from './types.js';

/**
 * Creates a cached version of scanContent().
 * Cache key is a hash of content + stringified options.
 * Cached results are returned with durationMs set to 0 to indicate cache hit.
 *
 * @param cacheOptions - LRU cache configuration
 * @returns Object with cached scan function and access to underlying cache
 */
export function createCachedScanner(cacheOptions?: { maxSize?: number; ttlMs?: number }) {
  const cache = new LRUCache<string, ScanResult>(cacheOptions);

  function scan(content: string, options: ScanOptions = {}): ScanResult {
    // Generate cache key from content hash + options hash
    const optionsStr = JSON.stringify(options ?? {});
    const key = contentHash(content + optionsStr);

    // Try cache hit
    const cached = cache.get(key);
    if (cached) {
      // Return cloned result with durationMs marked as 0 (cache hit)
      return { ...cached, durationMs: 0 };
    }

    // Cache miss: perform actual scan
    const result = scanContent(content, options);

    // Store in cache for future hits
    cache.set(key, result);

    return result;
  }

  return { scan, cache };
}
