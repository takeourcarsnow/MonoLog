/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSlideState, setSlideState } from '@/lib/slideStateCache';
import type { HydratedPost } from "@/lib/types";
import { PostCard } from "@/app/components/PostCard";
import { ViewToggle } from "@/app/components/ui/ViewToggle";
import { useFeed } from "@/lib/hooks/useFeed";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";
import { PullToRefreshWrapper } from "@/app/components/PullToRefresh";
import Link from "next/link";
import { User as UserIcon } from "lucide-react";
import { InfiniteScrollLoader } from "@/app/components/ui/LoadingIndicator";
import { GridView } from "@/app/components/feed/GridView";
import { useAuth } from "@/lib/hooks/useAuth";
import dynamic from "next/dynamic";
import { FeedEmptyState } from "@/app/components/feed/FeedEmptyState";
import { FeedListView } from "@/app/components/feed/FeedListView";
import { FeedGridView } from "@/app/components/feed/FeedGridView";
import { useScrollPersistence } from "@/lib/hooks/useScrollPersistence";
import { useBodyClass } from "@/lib/hooks/useBodyClass";
import { useAuthChange } from "@/lib/hooks/useAuthChange";

function useViewTransition(viewStorageKey: string) {
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem(viewStorageKey) as any)) || "list");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingView, setPendingView] = useState<"list" | "grid" | null>(null);
  const fadeRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleViewChange = useCallback((v: "list" | "grid") => {
    if (v === view) return;
    setPendingView(v);
    const el = fadeRef.current;
    if (!el) {
      setView(v);
      setPendingView(null);
      if (typeof window !== "undefined") localStorage.setItem(viewStorageKey, v);
      return;
    }

    if (cleanupRef.current) {
      try { cleanupRef.current(); } catch {}
      cleanupRef.current = null;
    }

    setIsTransitioning(true);

    const onEnd = (e: AnimationEvent) => {
      if (e.target !== el) return;
      el.removeEventListener('animationend', onEnd as any);
      setView(v);
      setPendingView(null);
      if (typeof window !== "undefined") localStorage.setItem(viewStorageKey, v);
      requestAnimationFrame(() => {
        setIsTransitioning(false);
      });
      cleanupRef.current = null;
    };

    el.addEventListener('animationend', onEnd as any);
    cleanupRef.current = () => {
      try { el.removeEventListener('animationend', onEnd as any); } catch {}
      setIsTransitioning(false);
    };

    requestAnimationFrame(() => {});
  }, [view, viewStorageKey]);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        try { cleanupRef.current(); } catch {}
      }
    };
  }, []);

  return { view, isTransitioning, pendingView, fadeRef, handleViewChange };
}

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
  const { view, isTransitioning, pendingView, fadeRef, handleViewChange } = useViewTransition(viewStorageKey);

  const { me } = useAuth();

  // Number of posts to show to unauthenticated users in explore view
  const UNAUTH_LIMIT = 8;

  // If this is the explore view and the user is unauthenticated, fetch up to
  // UNAUTH_LIMIT posts on the initial load so we can show that many before
  // prompting them to sign up. Otherwise default to the standard page size.
  const isExploreUnauthedEarly = viewStorageKey === 'exploreView' && !me;
  const initialPageSize = isExploreUnauthedEarly ? UNAUTH_LIMIT : 5;

  const { posts, loading, loadingMore, hasMore, error, loadInitialPosts, refresh, setSentinel, setPosts } = useFeed(
    fetchFunction,
    { pageSize: initialPageSize, applyFollowChangesOnUnmount: !!deferFollowChanges }
  );

  const { isRefreshing, pullDistance, isPulling, containerRef, getPullStyles } = usePullToRefresh({
    threshold: 80,
    onRefresh: refresh,
    disabled: posts.length === 0,
  });

  useScrollPersistence(scrollStateKey);
  useBodyClass(viewStorageKey);
  useAuthChange(loadInitialPosts);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await loadInitialPosts();
    })();
    return () => { mounted = false; };
  }, [loadInitialPosts]);

  // Simplified render - no need for memoization with complex dependencies
  const renderContent = () => {
    if (loading) {
      return null;
    }
    
    // Limit posts for unauthenticated users in explore view
    const isExploreUnauthed = viewStorageKey === 'exploreView' && !me;
    const limitedPosts = isExploreUnauthed ? posts.slice(0, UNAUTH_LIMIT) : posts;
    const limitedHasMore = isExploreUnauthed ? false : hasMore;
    const showEndMessage = !isExploreUnauthed;
    
    const onRetry = () => {
      const sentinel = document.querySelector('.feed-sentinel');
      if (sentinel) {
        setSentinel(sentinel as HTMLDivElement);
      }
    };

    if (!limitedPosts.length) {
      return <FeedEmptyState title={title} emptyMessage={emptyMessage} viewStorageKey={viewStorageKey} />;
    }

    return (
      <>
        {view === 'grid' ? (
          <FeedGridView
            posts={limitedPosts}
            hasMore={limitedHasMore}
            loadingMore={loadingMore}
            error={error}
            setSentinel={setSentinel}
            isExploreUnauthed={isExploreUnauthed}
            showEndMessage={showEndMessage}
            onRetry={onRetry}
          />
        ) : (
          <FeedListView
            posts={limitedPosts}
            hasMore={limitedHasMore}
            loadingMore={loadingMore}
            error={error}
            setSentinel={setSentinel}
            isExploreUnauthed={isExploreUnauthed}
            showEndMessage={showEndMessage}
            onRetry={onRetry}
          />
        )}
      </>
    );
  };

  return (
    <div className="view-fade">
      {(posts.length > 0 || viewStorageKey === 'hashtagView' || showToggle) && (
        <ViewToggle title={title} subtitle={subtitle} selected={pendingView ?? view} onSelect={handleViewChange} />
      )}
      <div ref={fadeRef} className={`feed ${view === 'grid' ? 'grid-view' : ''} fade-anim ${isTransitioning ? 'fade-hidden' : 'fade-visible'}`}>
        <PullToRefreshWrapper
          isRefreshing={isRefreshing}
          pullDistance={pullDistance}
          threshold={80}
          containerRef={containerRef}
          getPullStyles={getPullStyles}
          className={``}
        >
          {renderContent()}
        </PullToRefreshWrapper>
      </div>
    </div>
  );
}