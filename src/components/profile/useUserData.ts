import { useEffect, useState, useCallback } from "react";
import { api, getSupabaseClient } from "@/lib/api";
import { compressImage } from "@/lib/image";
import { uid } from "@/lib/id";
import { dedupe } from "@/lib/requestDeduplication";
import type { HydratedPost, User } from "@/lib/types";

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

      // Fetch user profile with deduplication
      const u = userId
        ? await dedupe(`getUser:${userId}`, () => api.getUser(userId))
        : me;

      if (!u) {
        setUser(null);
        setPosts([]);
        if (userId) setFollowing(false);
        return;
      }

      setUser(u);

      // Fetch posts with deduplication
      const userPosts = await dedupe(`getUserPosts:${u.id}`, () => api.getUserPosts(u.id));
      setPosts(userPosts);

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

    setLoading(true);

    fetchUserData().finally(() => {
      if (mounted) setLoading(false);
    });

    return () => { mounted = false; };
  }, [fetchUserData]);

  // Listen for newly created posts (from uploader) - optimized
  useEffect(() => {
    const onPostCreated = async () => {
      try {
        const me = await dedupe('getCurrentUser', () => api.getCurrentUser());
        if (!me) return;
        if (userId && userId !== me.id) return;

        const list = await dedupe(`getUserPosts:${me.id}`, () => api.getUserPosts(me.id));
        setUser(prev => prev || me);
        setPosts(list);
      } catch (e) { /* ignore refresh errors */ }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:post_created', onPostCreated as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('monolog:post_created', onPostCreated as any);
      }
    };
  }, [userId]);

  // When a global auth:changed event fires - optimized
  useEffect(() => {
    const handleAuthChanged = async () => {
      if (isOtherParam && currentUserId && currentUserId !== userId) return;

      let me: any = null;
      for (let i = 0; i < 8; i++) {
        // Use deduplication for auth checks
        me = await dedupe('getCurrentUser', () => api.getCurrentUser());
        if (me) break;
        await new Promise(r => setTimeout(r, 120));
      }

      if (me) {
        setCurrentUserId(me.id);
        setUser(me);
        try {
          const userPosts = await dedupe(`getUserPosts:${me.id}`, () => api.getUserPosts(me.id));
          setPosts(userPosts);
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
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:changed', handleAuthChanged as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:changed', handleAuthChanged as any);
      }
    };
  }, [userId, isOtherParam, currentUserId]);

  return { user, setUser, posts, setPosts, loading, setLoading, following, setFollowing, currentUserId, isOtherParam };
}