/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from "react";
import { getSlideState, setSlideState } from '@/src/lib/slideStateCache';
import type { HydratedPost } from "@/src/lib/types";
import { PostCard } from "./PostCard";
import { ViewToggle } from "./ViewToggle";
import { useFeed } from "@/src/lib/hooks/useFeed";
import { usePullToRefresh } from "@/src/lib/hooks/usePullToRefresh";
import { PullToRefreshWrapper } from "./PullToRefresh";
import { InfiniteScrollLoader } from "./LoadingIndicator";
import { SkeletonCard } from "./Skeleton";

// Lazy load GridView
const GridView = lazy(() => import("./GridView").then(mod => ({ default: mod.GridView })));

interface FeedPageProps {
  fetchFunction: (opts: { limit: number; before?: string }) => Promise<HydratedPost[]>;
  title: React.ReactNode;
  subtitle: string;
  viewStorageKey: string;
  scrollStateKey?: string;
  emptyMessage?: string;
}

export function FeedPage({
  fetchFunction,
  title,
  subtitle,
  viewStorageKey,
  scrollStateKey = 'feed',
  emptyMessage = "Your feed is quiet. Follow people in Explore to see their daily posts."
}: FeedPageProps) {
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem(viewStorageKey) as any)) || "list");

  const { posts, loading, loadingMore, hasMore, error, loadInitialPosts, refresh, setSentinel, setPosts } = useFeed(
    fetchFunction,
    { pageSize: 5 }
  );

  const { isRefreshing, pullDistance, isPulling, containerRef, getPullStyles } = usePullToRefresh({
    threshold: 80,
    onRefresh: refresh,
    disabled: posts.length === 0,
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

  // Refresh feed when a new post is created (user returns to feed after upload)
  useEffect(() => {
    const handler = () => loadInitialPosts();
    if (typeof window !== 'undefined') window.addEventListener('monolog:post_created', handler as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:post_created', handler as any); };
  }, [loadInitialPosts]);

  // Memoize the render function to prevent unnecessary recalculations
  const render = useMemo(() => {
    if (loading) return <SkeletonCard height={240} />;
    if (!posts.length) return <div className="empty">{emptyMessage}</div>;
    if (view === "grid") {
      return (
        <Suspense fallback={<div>Loading grid...</div>}>
          <GridView posts={posts} hasMore={hasMore} setSentinel={setSentinel} loadingMore={loadingMore} onRetry={() => {
            const sentinel = document.querySelector('.tile.sentinel');
            if (sentinel) {
              setSentinel(sentinel as HTMLDivElement);
            }
          }} error={error} />
        </Suspense>
      );
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