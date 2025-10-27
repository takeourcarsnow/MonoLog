/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback, useMemo, cloneElement, isValidElement } from "react";
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
import { GridView } from "./GridView";
import { useAuth } from "@/src/lib/hooks/useAuth";
import dynamic from "next/dynamic";

interface FeedPageProps {
  fetchFunction: (opts: { limit: number; before?: string }) => Promise<HydratedPost[]>;
  title: React.ReactNode;
  subtitle: string;
  viewStorageKey: string;
  scrollStateKey?: string;
  emptyMessage?: string;
  /** When true, follow changes won't remove posts from this view until it unmounts */
  deferFollowChanges?: boolean;
  /** Force-show the view toggle regardless of post count (opt-in) */
  showToggle?: boolean;
}

export function FeedPage({
  fetchFunction,
  title,
  subtitle,
  viewStorageKey,
  scrollStateKey = 'feed',
  emptyMessage = "Follow people to see their posts in your feed. Start by exploring creators, friends, and topics you like.",
  deferFollowChanges = false,
  showToggle = false,
}: FeedPageProps) {
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem(viewStorageKey) as any)) || "list");

  const { me } = useAuth();

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
      try {
        const scrollable = document.querySelector('.content') as HTMLElement;
        if (scrollable) scrollable.scrollTo(0, cached.scrollY);
      } catch (_) {}
    }
    return () => { mounted = false; };
  }, [loadInitialPosts, scrollStateKey]);

  // Enable page scrolling for feed-like pages
  // Ensure pages that rely on the legacy `page-scroll` body class get it.
  // Historically we toggled this globally; newer CSS uses :has() but some
  // environments/browsers may not support it. Add the class only for the
  // hashtag view to avoid affecting other pages.
  useEffect(() => {
    // Add a scoped body class for hashtag pages so we can apply a CSS
    // fallback (for browsers that don't support :has()). Using a specific
    // class avoids any unintended layout changes on other pages.
    try {
      if (typeof window !== 'undefined' && viewStorageKey === 'hashtagView') {
        document.body.classList.add('hashtag-page-scroll');
        return () => { document.body.classList.remove('hashtag-page-scroll'); };
      }
    } catch (_) { }
    return () => {};
  }, [viewStorageKey]);

  // Persist scroll position when FeedView unmounts
  useEffect(() => {
    return () => {
      try {
        const scrollable = document.querySelector('.content') as HTMLElement;
        const scrollY = scrollable ? scrollable.scrollTop : 0;
        setSlideState(scrollStateKey, { scrollY });
      } catch (_) {}
    };
  }, [scrollStateKey]);

  // Refresh feed when authentication changes (e.g., sign out)
  useEffect(() => {
    const handler = () => loadInitialPosts();
    if (typeof window !== 'undefined') window.addEventListener('auth:changed', handler as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('auth:changed', handler as any); };
  }, [loadInitialPosts]);

  // Simplified render - no need for memoization with complex dependencies
  const renderContent = useMemo(() => {
    if (loading) return <SkeletonCard height={240} />;
    
    // Limit posts for unauthenticated users in explore view
    const isExploreUnauthed = viewStorageKey === 'exploreView' && !me;
    const limitedPosts = isExploreUnauthed ? posts.slice(0, 3) : posts;
    const limitedHasMore = isExploreUnauthed ? false : hasMore;
    
    if (!limitedPosts.length) {
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
        <div className="empty feed-empty" style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', borderRadius: 16 }} aria-hidden>
              {iconNode}
            </div>

            <h2 style={{ margin: '6px 0 0 0', fontSize: '1.15rem' }}>{isExplore ? 'No posts to explore' : 'Your feed is quiet'}</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 420 }}>{emptyMessage}</p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
              {!isExplore && (
                <Link href="/explore" className="btn" aria-label="Explore users to follow">Explore users</Link>
              )}
            </div>

            {/* Removed duplicate bottom text — emptyMessage already contains the CTA/explanation */}
          </div>
        </div>
      );
    }

    const gridView = (
      <GridView posts={limitedPosts} hasMore={limitedHasMore} setSentinel={setSentinel} loadingMore={loadingMore} active={view === 'grid'} onRetry={() => {
        const sentinel = document.querySelector('.feed-sentinel');
        if (sentinel) {
          setSentinel(sentinel as HTMLDivElement);
        }
      }} error={error} />
    );

    const listView = (
      <>
        {limitedPosts.map(p => <PostCard key={p.id} post={p} disableCardNavigation={true} />)}
        {isExploreUnauthed && limitedPosts.length >= 3 && (
          <div className="feed-cta" style={{ textAlign: 'center', padding: '20px', margin: '20px 0' }}>
            <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>Enjoying the content? Sign in to see more posts and unlock the full experience.</p>
            <Link href="/profile" className="btn primary no-effects">Sign In</Link>
          </div>
        )}
        <InfiniteScrollLoader
          loading={loadingMore}
          hasMore={limitedHasMore}
          error={error}
          setSentinel={setSentinel}
          active={view === 'list'}
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

    return (
      <>
        <div style={{ display: view === 'grid' ? 'block' : 'none' }}>
          {gridView}
        </div>
        <div style={{ display: view === 'list' ? 'block' : 'none' }}>
          {listView}
        </div>
      </>
    );
  }, [loading, posts, view, hasMore, loadingMore, setSentinel, error, emptyMessage, title, viewStorageKey, me]);

  return (
    <div className="view-fade">
      {(posts.length > 0 || viewStorageKey === 'hashtagView' || showToggle) && (
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
        {renderContent}
      </PullToRefreshWrapper>
    </div>
  );
}