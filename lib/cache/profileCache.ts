// Client-side cache for profile data to prevent flickering during navigation
import type { User, HydratedPost } from "@/lib/types";

interface ProfileCacheEntry {
  user: User;
  posts: HydratedPost[];
  postCount: number;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, ProfileCacheEntry>();

export function getCachedProfile(userId: string): ProfileCacheEntry | null {
  const entry = cache.get(userId);
  if (!entry) return null;
  
  // Check if cache is still valid
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(userId);
    return null;
  }
  
  return entry;
}

export function setCachedProfile(userId: string, user: User, posts: HydratedPost[]) {
  cache.set(userId, {
    user,
    posts,
    postCount: posts.length,
    timestamp: Date.now()
  });
}

export function invalidateProfileCache(userId: string) {
  cache.delete(userId);
}

export function clearProfileCache() {
  cache.clear();
}
