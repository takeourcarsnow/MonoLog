// Simple in-memory cache for API responses to reduce redundant requests
// This helps avoid re-fetching data that hasn't changed (like user profiles, favorite status, etc.)

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hits: number; // Track usage for LRU-like behavior
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 30000; // 30 seconds default
  private maxEntries = 200; // Prevent memory leaks

  // Get cached value if not expired
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    // Update hit count for potential LRU eviction
    entry.hits++;
    return entry.data as T;
  }

  // Set cached value with optional custom TTL
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();

    // Check if we need to evict old entries
    if (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + (ttl || this.defaultTTL),
      hits: 0,
    };
    this.cache.set(key, entry);
  }

  // Evict least recently used entries when cache is full
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < oldestHits) {
        oldestHits = entry.hits;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
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

  // Invalidate user-related cache when user data changes
  invalidateUserCache(userId: string): void {
    this.invalidatePattern(`following:${userId}`);
    this.invalidatePattern(`user:${userId}`);
    this.invalidatePattern(`userPosts:${userId}`);
  }

  // Invalidate post-related cache
  invalidatePostCache(postId?: string): void {
    if (postId) {
      this.invalidatePattern(`post:${postId}`);
    }
    // Also invalidate feed caches as they might contain this post
    this.invalidatePattern(/^feed:/);
    this.invalidatePattern(/^explore:/);
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

  // Get cache statistics
  getStats() {
    const now = Date.now();
    const total = this.cache.size;
    const expired = Array.from(this.cache.values()).filter(entry => now > entry.expiresAt).length;
    const active = total - expired;

    return {
      total,
      active,
      expired,
      maxEntries: this.maxEntries,
    };
  }

  // Export metrics for analysis
  export() {
    return {
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt,
        hits: entry.hits,
        size: JSON.stringify(entry.data).length,
      })),
      stats: this.getStats(),
      timestamp: Date.now(),
    };
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
