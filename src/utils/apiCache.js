const cache = new Map();

/**
 * Stale-while-revalidate fetch.
 * - Returns cached data immediately (if available) via onData callback
 * - Always fires the real request in the background and calls onData again with fresh data
 * - TTL default: 30s — after that the cache is considered stale and a fresh fetch is awaited
 * - On 404 errors, automatically clears the cache to remove stale entries
 */
export async function cachedFetch(key, fetcher, { onData, onError, onLoading, ttl = 30_000 } = {}) {
  const cached = cache.get(key);

  if (cached) {
    onData?.(cached.data);
  } else {
    onLoading?.();
  }

  const now = Date.now();
  const isStale = !cached || (now - cached.ts) > ttl;
  if (!isStale) return;

  try {
    const fresh = await fetcher();
    cache.set(key, { data: fresh, ts: Date.now() });
    onData?.(fresh);
  } catch (e) {
    // If 404, clear the cache entry as the resource no longer exists
    if (e?.response?.status === 404) {
      console.warn('[Cache] 404 detected, invalidating cache for:', key);
      invalidateCache(key);
    }
    if (!cached) onError?.(e);
  }
}

export function invalidateCache(key) {
  cache.delete(key);
}

export function invalidateCachePrefix(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/**
 * Clear ALL cached data - use after database reset.
 */
export function clearAllCache() {
  cache.clear();
  console.log('[Cache] All cache cleared');
}

/**
 * Get cache statistics for debugging.
 */
export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
