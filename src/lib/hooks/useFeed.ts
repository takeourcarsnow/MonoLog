import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/src/lib/api";
import type { HydratedPost } from "@/src/lib/types";

interface UseFeedOptions {
  pageSize?: number;
  rootMargin?: string;
}

export function useFeed(fetchFunction: (opts: { limit: number; before?: string }) => Promise<HydratedPost[]>, options: UseFeedOptions = {}) {
  const { pageSize = 5, rootMargin = '200px' } = options;

  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const postsRef = useRef<HydratedPost[]>([]);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const loadInitialPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchFunction({ limit: pageSize });
      setPosts(page);
      setHasMore(page.length === pageSize);
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to load posts');
      setError(error);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, pageSize]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const page = await fetchFunction({ limit: pageSize });
      setPosts(page);
      setHasMore(page.length === pageSize);
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to refresh posts');
      setError(error);
      console.error(e);
      throw e; // Re-throw to allow pull-to-refresh to handle errors
    }
  }, [fetchFunction, pageSize]);

  const loadMorePosts = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);

    try {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      const last = postsRef.current[postsRef.current.length - 1];
      const before = last?.createdAt;
      const next = await fetchFunction({ limit: pageSize, before });

      setPosts(prev => [...prev, ...next]);
      setHasMore(next.length === pageSize);

      if (next.length === pageSize && sentinelRef.current) {
        observerRef.current?.observe(sentinelRef.current);
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to load more posts');
      setError(error);
      console.error(e);
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [fetchFunction, pageSize]);

  const setSentinel = useCallback((el: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    sentinelRef.current = el;

    if (!el || !hasMore) return;

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadMorePosts();
        }
      });
    }, { rootMargin });

    observerRef.current = obs;
    obs.observe(el);
  }, [hasMore, loadMorePosts, rootMargin]);

  // Remove deleted post from feed
  useEffect(() => {
    const onPostDeleted = (e: any) => {
      const deletedPostId = e?.detail?.postId;
      if (deletedPostId) {
        setPosts(prev => prev.filter(p => p.id !== deletedPostId));
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:post_deleted', onPostDeleted as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('monolog:post_deleted', onPostDeleted as any);
      }
    };
  }, []);

  // Handle follow changes optimistically
  useEffect(() => {
    const onFollowChanged = (e: any) => {
      const changedUserId = e?.detail?.userId;
      const following = e?.detail?.following;
      if (!changedUserId) return;

      if (!following) {
        // Unfollowing: remove posts from this user optimistically
        setPosts(prev => prev.filter(p => p.userId !== changedUserId));
      } else {
        // Following: for now, refetch to add new posts
        // In future, could fetch user's posts and prepend, but refetch is simpler
        loadInitialPosts();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:follow_changed', onFollowChanged as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('monolog:follow_changed', onFollowChanged as any);
      }
    };
  }, [loadInitialPosts]);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    loadInitialPosts,
    refresh,
    setSentinel,
    setPosts
  };
}