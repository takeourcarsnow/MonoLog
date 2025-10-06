/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { api } from "@/src/lib/api";
import { getSlideState, setSlideState } from '@/src/lib/slideStateCache';
import type { HydratedPost } from "@/src/lib/types";
import { PostCard } from "./PostCard";
import { ViewToggle } from "./ViewToggle";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";
import { useFeed } from "@/src/lib/hooks/useFeed";
import { usePullToRefresh } from "@/src/lib/hooks/usePullToRefresh";
import { GridView } from "./GridView";
import { PullToRefreshWrapper } from "./PullToRefresh";
import { InfiniteScrollLoader } from "./LoadingIndicator";

// Custom hook to handle grid view double-click logic with proper cleanup
function useGridDoubleClick(toast: any, router: any) {
  const clickCountsRef = useRef(new Map<string, number>());
  const clickTimersRef = useRef(new Map<string, any>());
  const dblClickFlagsRef = useRef(new Map<string, boolean>());
  const overlayTimeoutsRef = useRef(new Map<string, any>());

  const showOverlay = useCallback((postId: string, action: 'adding' | 'removing') => {
    // Clear any existing timeout for this post
    const existingTimeout = overlayTimeoutsRef.current.get(postId);
    if (existingTimeout) clearTimeout(existingTimeout);

    const duration = action === 'adding' ? 600 : 500;
    const timeout = setTimeout(() => {
      overlayTimeoutsRef.current.delete(postId);
    }, duration);
    overlayTimeoutsRef.current.set(postId, timeout);
  }, []);

  const handleTileClick = useCallback((e: React.MouseEvent, post: HydratedPost) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (dblClickFlagsRef.current.get(post.id)) return;
    
    const href = `/post/${post.user.username || post.userId}-${post.id.slice(0,8)}`;
    const count = (clickCountsRef.current.get(post.id) || 0) + 1;
    clickCountsRef.current.set(post.id, count);
    
    if (count === 1) {
      const timer = setTimeout(() => {
        if (!dblClickFlagsRef.current.get(post.id)) {
          try { router.push(href); } catch (_) {}
        }
        clickCountsRef.current.set(post.id, 0);
        dblClickFlagsRef.current.delete(post.id);
      }, 280);
      clickTimersRef.current.set(post.id, timer);
    }
  }, [router]);

  const handleTileDblClick = useCallback(async (e: React.MouseEvent, post: HydratedPost) => {
    e.preventDefault();
    e.stopPropagation();
    
    dblClickFlagsRef.current.set(post.id, true);
    
    const timer = clickTimersRef.current.get(post.id);
    if (timer) {
      clearTimeout(timer);
      clickTimersRef.current.delete(post.id);
    }
    
    clickCountsRef.current.set(post.id, 0);
    
    try {
      const cur = await api.getCurrentUser();
      if (!cur) { toast.show('Sign in to favorite'); return; }
      
      // Check if already favorited to toggle properly
      const isFav = await api.isFavorite(post.id);
      if (isFav) {
        await api.unfavoritePost(post.id);
        toast.show('Removed from favorites');
        showOverlay(post.id, 'removing');
      } else {
        await api.favoritePost(post.id);
        toast.show('Added to favorites');
        showOverlay(post.id, 'adding');
      }
    } catch (e:any) {
      toast.show(e?.message || 'Failed');
    }
    
    setTimeout(() => {
      dblClickFlagsRef.current.delete(post.id);
    }, 400);
  }, [toast, showOverlay]);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear all timers
    clickTimersRef.current.forEach(timer => clearTimeout(timer));
    clickTimersRef.current.clear();
    
    overlayTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    overlayTimeoutsRef.current.clear();
    
    clickCountsRef.current.clear();
    dblClickFlagsRef.current.clear();
  }, []);

  return { handleTileClick, handleTileDblClick, showOverlay, cleanup };
}

export function FeedView() {
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem("feedView") as any)) || "list");

  const fetchFollowingFeed = useCallback((opts: { limit: number; before?: string }) => api.getFollowingFeedPage(opts), []);

  const { posts, loading, loadingMore, hasMore, error, loadInitialPosts, refresh, setSentinel, setPosts } = useFeed(
    fetchFollowingFeed,
    { pageSize: 3 }
  );

  const { isRefreshing, pullDistance, isPulling, containerRef, getPullStyles } = usePullToRefresh({
    threshold: 80,
    onRefresh: refresh,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await loadInitialPosts();
    })();
    // restore scroll position if cached
    const cached = getSlideState<{ scrollY?: number }>('feed');
    if (cached?.scrollY && typeof window !== 'undefined') {
      try { window.scrollTo(0, cached.scrollY); } catch (_) {}
    }
    return () => { mounted = false; };
  }, [loadInitialPosts]);

  // Persist scroll position when FeedView unmounts
  useEffect(() => {
    return () => {
      try { setSlideState('feed', { scrollY: typeof window !== 'undefined' ? window.scrollY : 0 }); } catch (_) {}
    };
  }, []);

  // Refresh feed only when a FOLLOW action occurs elsewhere AND the newly
  // followed user's posts are not already in the current list. This prevents
  // a disruptive refetch when you quickly unfollow/refollow someone whose
  // posts are already visible (original request: avoid instant feed refresh
  // side-effects for these toggles).
  useEffect(() => {
    const onFollowChange = (e: any) => {
      try {
        const following = e?.detail?.following;
        const changedUserId = e?.detail?.userId;
        if (!following) return; // ignore unfollow events entirely

        // If the followed user's posts are already present (e.g. user unfollowed
        // then re-followed), skip refetch to avoid flicker.
        if (changedUserId && posts.some(p => p.userId === changedUserId)) return;

        // Otherwise fetch the first page again so new followed users' posts appear.
        loadInitialPosts();
      } catch (err) { /* ignore */ }
    };
    if (typeof window !== 'undefined') window.addEventListener('monolog:follow_changed', onFollowChange as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:follow_changed', onFollowChange as any); };
  }, [loadInitialPosts, posts]);

  // Refresh feed when a new post is created (user returns to feed after upload)
  useEffect(() => {
    const onPostCreated = () => loadInitialPosts();
    if (typeof window !== 'undefined') window.addEventListener('monolog:post_created', onPostCreated as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:post_created', onPostCreated as any); };
  }, [loadInitialPosts]);

  // Memoize the render function to prevent unnecessary recalculations
  const render = useMemo(() => {
    if (loading) return <div className="card skeleton" style={{ height: 240 }} />;
    if (!posts.length) return <div className="empty">Your feed is quiet. Follow people in Explore to see their daily photo.</div>;
    if (view === "grid") {
      return <GridView posts={posts} hasMore={hasMore} setSentinel={setSentinel} loadingMore={loadingMore} onRetry={() => {
        const sentinel = document.querySelector('.tile.sentinel');
        if (sentinel) {
          setSentinel(sentinel as HTMLDivElement);
        }
      }} error={error} />;
    }
    return (
      <>
        {posts.map(p => <PostCard key={p.id} post={p} />)}
        <InfiniteScrollLoader
          loading={loadingMore}
          hasMore={hasMore}
          error={error}
          onRetry={() => {
            // Retry loading more posts
            const sentinel = document.querySelector('.feed-sentinel');
            if (sentinel) {
              setSentinel(sentinel as HTMLDivElement);
            }
          }}
        />
      </>
    );
  }, [loading, posts, view, hasMore, loadingMore, setSentinel, error]);

  return (
    <div className="view-fade">
      <ViewToggle title={<Home size={20} strokeWidth={2} />} subtitle="MonoLogs from you & people that you follow" selected={view} onSelect={(v) => { setView(v); if (typeof window !== "undefined") localStorage.setItem("feedView", v); }} />
      <PullToRefreshWrapper
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        threshold={80}
        containerRef={containerRef}
        getPullStyles={getPullStyles}
        className={`feed ${view === 'grid' ? 'grid-view' : ''}`}
      >
        {render}
      </PullToRefreshWrapper>
    </div>
  );
}
