import { useEffect, useState, useCallback } from "react";
import { api, getSupabaseClient } from "@/lib/api";
import { compressImage } from "@/lib/image";
import { uid } from "@/lib/id";
import { dedupe } from "@/lib/requestDeduplication";
import type { HydratedPost, User } from "@/lib/types";
import { useEventListener } from "@/lib/hooks/useEventListener";
import { getCachedProfile, setCachedProfile, invalidateProfileCache } from "@/lib/cache/profileCache";

function looksLikeUuid(s: string) {
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(s);
}

// Accept either a user id (UUID) or a username. If a non-UUID string is
// provided, resolve it via api.getUserByUsername so callers can pass either.
export function useUserData(userId?: string) {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isOtherParam = !!userId;

  // Optimize data fetching with request deduplication
  const fetchUserData = useCallback(async () => {
    try {
      // Determine signed-in user with deduplication
      const me = await dedupe('getCurrentUser', () => api.getCurrentUser());
      setCurrentUserId(me?.id || null);

      // If caller passed a non-UUID string, treat it as a username and
      // resolve to a user profile. Otherwise treat value as an id.
      let u: User | null = null;
      let resolvedUserId: string | null = null;

      if (userId) {
        if (looksLikeUuid(userId)) {
          resolvedUserId = userId;
          u = await dedupe(`getUser:${userId}`, () => api.getUser(userId));
        } else if (api.getUserByUsername) {
          u = await dedupe(`getUserByUsername:${userId}`, () => api.getUserByUsername!(userId));
          resolvedUserId = u?.id || null;
        } else {
          // Fallback: try getUser which may accept username in some adapters
          u = await dedupe(`getUser:${userId}`, () => api.getUser(userId));
          resolvedUserId = u?.id || null;
        }
      } else {
        u = me;
        resolvedUserId = me?.id || null;
      }

      if (!u) {
        setUser(null);
        setPosts([]);
        if (userId) setFollowing(false);
        return;
      }

      // Check cache first and use it to prevent flickering
      const cached = resolvedUserId ? getCachedProfile(resolvedUserId) : null;
      if (cached) {
        setUser(cached.user);
        setPosts(cached.posts);
      } else {
        setUser(u);
      }

      // Fetch posts with deduplication
      const userPosts = await dedupe(`getUserPosts:${u.id}`, () => api.getUserPosts(u.id, 50));
      setPosts(userPosts);

      // Update cache with fresh data
      if (resolvedUserId) {
        setCachedProfile(resolvedUserId, u, userPosts);
      }

      // Only compute following state when viewing another user's profile
      if (userId) {
        if (me?.id === u.id) {
          setFollowing(null);
        } else {
          const isFollowingUser = await dedupe(`isFollowing:${u.id}`, () => api.isFollowing(u.id));
          setFollowing(isFollowingUser);
        }
      }
    } catch (e) {
      // swallow and let UI show not-found if appropriate
    }
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    let cacheLoaded = false;

    // Try to load from cache synchronously first to prevent any flickering
    const loadCachedDataSync = () => {
      try {
        // For own profile (no userId), check cache immediately
        if (!userId) {
          // We can't know the current user ID synchronously, so we'll need to check after
          return false;
        }

        // For other users with UUID, check cache synchronously
        if (looksLikeUuid(userId)) {
          const cached = getCachedProfile(userId);
          if (cached) {
            setUser(cached.user);
            setPosts(cached.posts);
            setLoading(false);
            return true;
          }
        }
        return false;
      } catch (e) {
        return false;
      }
    };

    // Try to load from cache asynchronously (for username lookups and own profile)
    const loadCachedDataAsync = async () => {
      try {
        const me = await dedupe('getCurrentUser', () => api.getCurrentUser());
        let resolvedUserId: string | null = null;

        if (userId) {
          if (looksLikeUuid(userId)) {
            resolvedUserId = userId;
          } else if (api.getUserByUsername) {
            const u = await dedupe(`getUserByUsername:${userId}`, () => api.getUserByUsername!(userId));
            resolvedUserId = u?.id || null;
          }
        } else {
          resolvedUserId = me?.id || null;
        }

        if (resolvedUserId && !cacheLoaded) {
          const cached = getCachedProfile(resolvedUserId);
          if (cached && mounted) {
            setUser(cached.user);
            setPosts(cached.posts);
            setLoading(false);
            cacheLoaded = true;
          }
        }
      } catch (e) {
        // Ignore cache load errors
      }
    };

    // Try synchronous cache load first
    cacheLoaded = loadCachedDataSync();

    if (!cacheLoaded) {
      setLoading(true);
      // Only clear state if we don't have cache and it's not a potential UUID
      const hasPotentialCache = userId ? looksLikeUuid(userId) : true;
      if (!hasPotentialCache) {
        setUser(null);
        setPosts([]);
      }
      // Load cache asynchronously
      loadCachedDataAsync();
    }

    // Fetch fresh data in background
    fetchUserData().finally(() => {
      if (mounted) setLoading(false);
    });

    return () => { mounted = false; };
  }, [fetchUserData, userId]);

  // Listen for follow changes to update following status
  useEventListener('monolog:follow_changed', async (e: any) => {
    const changedUserId = e?.detail?.userId;
    const following = e?.detail?.following;
    console.log('DEBUG useUserData: follow_changed event', { changedUserId, following, userId });
    if (!changedUserId || !userId) return;
    // If viewing another user's profile, check if it's the user we just followed/unfollowed
    if (userId === changedUserId) {
      console.log('DEBUG useUserData: updating following to', following);
      setFollowing(following);
    }
  });

  // Listen for deleted posts
  useEventListener('monolog:post_deleted', (e: any) => {
    const deletedPostId = e?.detail?.postId;
    if (deletedPostId) {
      setPosts(prev => {
        const updated = prev.filter(p => p.id !== deletedPostId);
        // Update cache with filtered posts
        if (user?.id) {
          setCachedProfile(user.id, user, updated);
        }
        return updated;
      });
    }
  });

  // When a global auth:changed event fires - optimized
  useEventListener('auth:changed', async () => {
    if (isOtherParam && currentUserId && currentUserId !== userId) return;

    let me: any = null;
    for (let i = 0; i < 8; i++) {
      // Skip dedupe for auth changes to ensure fresh data after profile updates
      me = await api.getCurrentUser();
      if (me) break;
      await new Promise(r => setTimeout(r, 120));
    }

    if (me) {
      setCurrentUserId(me.id);
      setUser(me);
      try {
        const userPosts = await dedupe(`getUserPosts:${me.id}`, () => api.getUserPosts(me.id, 50));
        setPosts(userPosts);
        
        // Update cache after auth change
        setCachedProfile(me.id, me, userPosts);
      } catch (_) {}
      setLoading(false);
      return;
    }

    // No authenticated user found. Clear viewer state for the "own profile"
    // route so the page can show the sign in / sign up form instead of
    // incorrectly continuing to render a stale signed-in profile.
    setCurrentUserId(null);
    if (!isOtherParam) {
      setUser(null);
      setPosts([]);
      setLoading(false);
    }
  }, [userId, isOtherParam, currentUserId]);

  return { user, setUser, posts, setPosts, loading, setLoading, following, setFollowing, currentUserId, isOtherParam };
}
