/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getSlideState, setSlideState } from '@/src/lib/slideStateCache';
import type { HydratedPost } from "@/src/lib/types";
import { PostCard } from "./PostCard";
import { ViewToggle } from "./ViewToggle";
import { useFeed } from "@/src/lib/hooks/useFeed";
import { usePullToRefresh } from "@/src/lib/hooks/usePullToRefresh";
import { GridView } from "./GridView";
import { PullToRefreshWrapper } from "./PullToRefresh";
import { InfiniteScrollLoader } from "./LoadingIndicator";

interface FeedPageProps {
  fetchFunction: (opts: { limit: number; before?: string }) => Promise<HydratedPost[]>;
  title: React.ReactNode;
  subtitle: string;
  viewStorageKey: string;
  onFollowChange?: (posts: HydratedPost[], loadInitialPosts: () => Promise<void>) => (e: any) => void;
  scrollStateKey?: string;
  emptyMessage?: string;
}

export function FeedPage({
  fetchFunction,
  title,
  subtitle,
  viewStorageKey,
  onFollowChange,
  scrollStateKey = 'feed',
  emptyMessage = "Your feed is quiet. Follow people in Explore to see their daily photo."
}: FeedPageProps) {
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem(viewStorageKey) as any)) || "list");

  const { posts, loading, loadingMore, hasMore, error, loadInitialPosts, refresh, setSentinel, setPosts } = useFeed(
    fetchFunction,
    { pageSize: 5 }
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
    const cached = getSlideState<{ scrollY?: number }>(scrollStateKey);
    if (cached?.scrollY && typeof window !== 'undefined') {
      try { window.scrollTo(0, cached.scrollY); } catch (_) {}
    }
    return () => { mounted = false; };
  }, [loadInitialPosts, scrollStateKey]);

  // Persist scroll position when FeedView unmounts
  useEffect(() => {
    return () => {
      try { setSlideState(scrollStateKey, { scrollY: typeof window !== 'undefined' ? window.scrollY : 0 }); } catch (_) {}
    };
  }, [scrollStateKey]);

  // Refresh feed only when a FOLLOW action occurs elsewhere AND the newly
  // followed user's posts are not already in the current list. This prevents
  // a disruptive refetch when you quickly unfollow/refollow someone whose
  // posts are already visible (original request: avoid instant feed refresh
  // side-effects for these toggles).
  useEffect(() => {
    if (!onFollowChange) return;
    const handler = onFollowChange(posts, loadInitialPosts);
    if (typeof window !== 'undefined') window.addEventListener('monolog:follow_changed', handler as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:follow_changed', handler as any); };
  }, [onFollowChange, posts, loadInitialPosts]);

  // Refresh feed when a new post is created (user returns to feed after upload)
  useEffect(() => {
    const handler = () => loadInitialPosts();
    if (typeof window !== 'undefined') window.addEventListener('monolog:post_created', handler as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:post_created', handler as any); };
  }, [loadInitialPosts]);

  // Memoize the render function to prevent unnecessary recalculations
  const render = useMemo(() => {
    if (loading) return <div className="card skeleton" style={{ height: 240 }} />;
    if (!posts.length) return <div className="empty">{emptyMessage}</div>;
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
          setSentinel={setSentinel}
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
  }, [loading, posts, view, hasMore, loadingMore, setSentinel, error, emptyMessage]);

  return (
    <div className="view-fade">
      <ViewToggle title={title} subtitle={subtitle} selected={view} onSelect={(v) => { setView(v); if (typeof window !== "undefined") localStorage.setItem(viewStorageKey, v); }} />
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