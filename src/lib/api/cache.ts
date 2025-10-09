// Simple in-memory cache for API responses to reduce redundant requests
// This helps avoid re-fetching data that hasn't changed (like user profiles, favorite status, etc.)

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 30000; // 30 seconds default

  // Get cached value if not expired
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  // Set cached value with optional custom TTL
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + (ttl || this.defaultTTL),
    };
    this.cache.set(key, entry);
  }

  // Invalidate specific key
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  // Invalidate keys matching a pattern
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton cache instance
export const apiCache = new ApiCache();

// Auto-cleanup expired entries every 60 seconds. Guard to avoid duplicate
// intervals during HMR/module reloads.
if (typeof window !== 'undefined') {
  const key = '__MONOLOG_API_CACHE_CLEANUP_INTERVAL_V2__';
  if (!(window as any)[key]) {
    (window as any)[key] = setInterval(() => {
      apiCache.cleanup();
    }, 60000);
    window.addEventListener('beforeunload', () => {
      try { clearInterval((window as any)[key]); } catch (_) {}
      try { (window as any)[key] = null; } catch (_) {}
    });
  }
}

// Helper to create a cache key
export function cacheKey(prefix: string, ...parts: (string | number | undefined)[]): string {
  return `${prefix}:${parts.filter(Boolean).join(':')}`;
}

// Wrapper for caching async functions
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = apiCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  const data = await fetcher();
  apiCache.set(key, data, ttl);
  return data;
}
