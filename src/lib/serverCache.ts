// Very small in-memory cache for server-only routes.
// Not suitable for multi-instance deployments — use Redis or similar there.
type CacheEntry = { value: any; expires: number };
const cache = new Map<string, CacheEntry>();

export function getServerCache(key: string) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) {
    cache.delete(key);
    return null;
  }
  return e.value;
}

export function setServerCache(key: string, value: any, ttl = 10000) {
  try {
    cache.set(key, { value, expires: Date.now() + ttl });
  } catch (_) {
    // swallow cache set errors
  }
}

export function delServerCache(key: string) {
  try { cache.delete(key); } catch (_) {}
}

export function clearServerCachePrefix(prefix: string) {
  try {
    for (const k of Array.from(cache.keys())) {
      if (k.startsWith(prefix)) cache.delete(k);
    }
  } catch (_) {}
}

export function serverCacheStats() {
  return { keys: cache.size };
}
