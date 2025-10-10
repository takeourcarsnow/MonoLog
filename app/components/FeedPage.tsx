/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback, useMemo, lazy, Suspense, cloneElement, isValidElement } from "react";
import { getSlideState, setSlideState } from '@/src/lib/slideStateCache';
import type { HydratedPost } from "@/src/lib/types";
import { PostCard } from "./PostCard";
import { ViewToggle } from "./ViewToggle";
import { useFeed } from "@/src/lib/hooks/useFeed";
import { usePullToRefresh } from "@/src/lib/hooks/usePullToRefresh";
import { PullToRefreshWrapper } from "./PullToRefresh";
import Link from "next/link";
import { User as UserIcon } from "lucide-react";
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
  /** When true, follow changes won't remove posts from this view until it unmounts */
  deferFollowChanges?: boolean;
}

export function FeedPage({
  fetchFunction,
  title,
  subtitle,
  viewStorageKey,
  scrollStateKey = 'feed',
  emptyMessage = "Follow people in Explore to see their daily posts.",
  deferFollowChanges = false,
}: FeedPageProps) {
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem(viewStorageKey) as any)) || "list");

  const { posts, loading, loadingMore, hasMore, error, loadInitialPosts, refresh, setSentinel, setPosts } = useFeed(
    fetchFunction,
    { pageSize: 5, applyFollowChangesOnUnmount: !!deferFollowChanges }
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

  // Update sentinel when view changes
  useEffect(() => {
    if (view === 'grid') {
      const sentinel = document.querySelector('.tile.sentinel');
      if (sentinel) setSentinel(sentinel as HTMLDivElement);
    } else {
      const sentinel = document.querySelector('.feed-sentinel');
      if (sentinel) setSentinel(sentinel as HTMLDivElement);
    }
  }, [view, setSentinel]);

  // Refresh feed when authentication changes (e.g., sign out)
  useEffect(() => {
    const handler = () => loadInitialPosts();
    if (typeof window !== 'undefined') window.addEventListener('auth:changed', handler as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('auth:changed', handler as any); };
  }, [loadInitialPosts]);

  // Memoize the render function to prevent unnecessary recalculations
  const render = useMemo(() => {
    if (loading) return <SkeletonCard height={240} />;
    if (!posts.length) {
      // Enhanced empty state: reuse the title icon if available (Feed/Explore pass icons)
      let iconNode: React.ReactNode = null;
      if (isValidElement(title)) {
        try {
          iconNode = cloneElement(title as any, { size: 56, strokeWidth: 1.5 });
        } catch (_) {
          iconNode = null;
        }
      }
      if (!iconNode) iconNode = <UserIcon size={56} strokeWidth={1.5} />;

      // Determine which view this is by viewStorageKey to tune CTAs
      const isExplore = viewStorageKey === 'exploreView';

      return (
        <div className="empty feed-empty" style={{ textAlign: 'center' }}>
          <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', borderRadius: 16 }} aria-hidden>
              {iconNode}
            </div>

            <h2 style={{ margin: '6px 0 0 0', fontSize: '1.15rem' }}>{isExplore ? 'No posts yet' : 'Your feed is quiet'}</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 420 }}>{emptyMessage}</p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
              {isExplore ? (
                <Link href="/upload" className="btn">Create a post</Link>
              ) : (
                <>
                  <Link href="/explore" className="btn">Explore users</Link>
                  <Link href="/upload" className="btn" style={{ background: 'transparent', border: '1px solid var(--muted-border)', color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: 8 }}>Upload</Link>
                </>
              )}
            </div>

            {/* Removed duplicate bottom text — emptyMessage already contains the CTA/explanation */}
          </div>
        </div>
      );
    }
    return (
      view === "grid" ? (
        <Suspense fallback={<div>Loading grid...</div>}>
          <GridView posts={posts} hasMore={hasMore} setSentinel={setSentinel} loadingMore={loadingMore} onRetry={() => {
            const sentinel = document.querySelector('.tile.sentinel');
            if (sentinel) {
              setSentinel(sentinel as HTMLDivElement);
            }
          }} error={error} />
        </Suspense>
      ) : (
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
      )
    );
  }, [loading, posts, view, hasMore, loadingMore, setSentinel, error, emptyMessage, title, viewStorageKey]);

  return (
    <div className="view-fade">
      {posts.length > 0 && (
        <ViewToggle title={title} subtitle={subtitle} selected={view} onSelect={(v) => { setView(v); if (typeof window !== "undefined") localStorage.setItem(viewStorageKey, v); }} />
      )}
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