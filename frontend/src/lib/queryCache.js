/**
 * Simple in-memory stale-while-revalidate cache for Supabase queries.
 * Data is kept for `ttl` ms. On re-mount, stale data is returned immediately
 * while a background fetch updates the cache — so pages feel instant.
 */

const cache = new Map() // key → { data, ts }

/**
 * Read from cache. Returns data if within TTL, otherwise returns stale data
 * and signals the caller to refetch.
 * @param {string} key
 * @param {number} ttl  ms — default 60 seconds
 * @returns {{ data: any|null, stale: boolean }}
 */
export function getCached(key, ttl = 60_000) {
  const entry = cache.get(key)
  if (!entry) return { data: null, stale: true }
  const stale = Date.now() - entry.ts > ttl
  return { data: entry.data, stale }
}

/**
 * Write to cache.
 * @param {string} key
 * @param {any} data
 */
export function setCached(key, data) {
  cache.set(key, { data, ts: Date.now() })
}

/**
 * Invalidate a cache key (or prefix).
 * @param {string|string[]} keys
 */
export function invalidateCache(...keys) {
  keys.forEach(k => {
    // Support prefix invalidation: 'projects:' clears all keys starting with it
    if (k.endsWith(':')) {
      for (const ck of cache.keys()) {
        if (ck.startsWith(k)) cache.delete(ck)
      }
    } else {
      cache.delete(k)
    }
  })
}
