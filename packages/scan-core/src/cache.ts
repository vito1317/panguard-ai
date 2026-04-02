/**
 * LRU Cache for scan results.
 * Avoids re-scanning identical content within a session.
 * Pure in-memory, no persistence.
 */
export class LRUCache<K, V> {
  // Map preserves insertion order; we exploit that for LRU eviction
  private readonly map = new Map<K, { value: V; expiry: number }>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(options: { maxSize?: number; ttlMs?: number } = {}) {
    this.maxSize = options.maxSize ?? 500;
    this.ttlMs = options.ttlMs ?? 60_000; // 1 minute default
  }

  /**
   * Retrieve value from cache if it exists and hasn't expired.
   */
  get(key: K): V | undefined {
    this.evictExpired();
    const entry = this.map.get(key);
    if (!entry) return undefined;

    // Check expiry
    if (entry.expiry < Date.now()) {
      this.map.delete(key);
      return undefined;
    }

    // LRU: move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  /**
   * Insert or update a value in the cache.
   */
  set(key: K, value: V): void {
    this.evictExpired();

    // If key exists, remove it first (to update its position)
    if (this.map.has(key)) {
      this.map.delete(key);
    }

    // Add to end (most recently used)
    const expiry = Date.now() + this.ttlMs;
    this.map.set(key, { value, expiry });

    // Evict least recently used if over capacity
    while (this.map.size > this.maxSize) {
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
  }

  /**
   * Check if a key exists in the cache (and hasn't expired).
   */
  has(key: K): boolean {
    this.evictExpired();
    const entry = this.map.get(key);
    if (!entry) return false;

    // Check expiry
    if (entry.expiry < Date.now()) {
      this.map.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache.
   */
  delete(key: K): boolean {
    return this.map.delete(key);
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.map.clear();
  }

  /**
   * Get the current number of non-expired entries.
   */
  get size(): number {
    this.evictExpired();
    return this.map.size;
  }

  /**
   * Evict all expired entries.
   */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.map.entries()) {
      if (entry.expiry < now) {
        this.map.delete(key);
      }
    }
  }
}
