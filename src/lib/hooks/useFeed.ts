import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/src/lib/api";
import type { HydratedPost } from "@/src/lib/types";
import { useEventListener } from "./useEventListener";

// Simplified infinite scroll logic
function useInfiniteScroll(fetchFunction: (opts: { limit: number; before?: string }) => Promise<HydratedPost[]>, pageSize: number) {
  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadInitialPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchFunction({ limit: pageSize });
      setPosts(page);
      setHasMore(page.length === pageSize);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load posts'));
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
      setError(e instanceof Error ? e : new Error('Failed to refresh posts'));
      throw e;
    }
  }, [fetchFunction, pageSize]);

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError(null);

    try {
      const last = posts[posts.length - 1];
      const before = last?.createdAt;
      const next = await fetchFunction({ limit: pageSize, before });

      setPosts(prev => [...prev, ...next]);
      setHasMore(next.length === pageSize);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load more posts'));
    } finally {
      setLoadingMore(false);
    }
  }, [fetchFunction, pageSize, posts, loadingMore, hasMore]);

  const setSentinel = useCallback((el: HTMLDivElement | null) => {
    if (!el || !hasMore) return;

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadMorePosts();
        }
      });
    }, { rootMargin: '20%' });

    obs.observe(el);

    return () => obs.disconnect();
  }, [hasMore, loadMorePosts]);

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

// Custom hook for feed-related event handling
function useFeedEvents(applyFollowChangesOnUnmount: boolean, loadInitialPosts: () => Promise<void>) {
  // Remove deleted post from feed
  useEventListener('monolog:post_deleted', (e: any) => {
    const deletedPostId = e?.detail?.postId;
    if (deletedPostId) {
      // This would need access to setPosts, so we'll return a handler
    }
  });

  // Refresh feed when a new post is created
  useEventListener('monolog:post_created', () => {
    loadInitialPosts();
  });

  // Handle follow changes
  useEventListener('monolog:follow_changed', (e: any) => {
    const changedUserId = e?.detail?.userId;
    const following = e?.detail?.following;
    if (!changedUserId) return;

    if (applyFollowChangesOnUnmount) {
      // Defer applying changes while view is mounted.
      return;
    }
    // This would need access to setPosts, so we'll return handlers
  });

  // Refresh feed when page is restored from bfcache
  useEffect(() => {
    const pageshowHandler = (event: PageTransitionEvent) => {
      if (event.persisted) {
        loadInitialPosts();
      }
    };
    window.addEventListener('pageshow', pageshowHandler);
    // Do not remove to handle bfcache
  }, [loadInitialPosts]);

  // Refresh feed when authentication state changes (sign in / sign out)
  useEffect(() => {
    const handler = () => {
      try { loadInitialPosts(); } catch (_) {}
    };
    if (typeof window !== 'undefined') window.addEventListener('auth:changed', handler as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('auth:changed', handler as any); };
  }, [loadInitialPosts]);
}

interface UseFeedOptions {
  pageSize?: number;
  rootMargin?: string;
  /** If true, do not apply follow changes immediately while this view is mounted. */
  applyFollowChangesOnUnmount?: boolean;
  /** Optional ID/name for the view (for debugging or future use) */
  viewId?: string;
}

export function useFeed(fetchFunction: (opts: { limit: number; before?: string }) => Promise<HydratedPost[]>, options: UseFeedOptions = {}) {
  const { pageSize = 5, applyFollowChangesOnUnmount = false } = options;

  const scrollHook = useInfiniteScroll(fetchFunction, pageSize);
  const { posts, setPosts, loadInitialPosts } = scrollHook;

  // Event handlers that need access to setPosts
  useEventListener('monolog:post_deleted', (e: any) => {
    const deletedPostId = e?.detail?.postId;
    if (deletedPostId) {
      setPosts(prev => prev.filter(p => p.id !== deletedPostId));
    }
  });

  useEventListener('monolog:follow_changed', (e: any) => {
    const changedUserId = e?.detail?.userId;
    const following = e?.detail?.following;
    if (!changedUserId) return;

    if (applyFollowChangesOnUnmount) {
      // Defer applying changes while view is mounted.
      return;
    }

    if (!following) {
      // Unfollowing: remove posts from this user optimistically
      setPosts(prev => prev.filter(p => p.userId !== changedUserId));
    } else {
      // Following: refetch to add new posts
      loadInitialPosts();
    }
  });

  useFeedEvents(applyFollowChangesOnUnmount, loadInitialPosts);

  return scrollHook;
}