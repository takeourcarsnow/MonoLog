/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback } from "react";
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
import { PostCardSkeleton } from "./SkeletonCard";
import { GridView } from "./GridView";
import { useAuth } from "@/src/lib/hooks/useAuth";
import dynamic from "next/dynamic";
import { FeedEmptyState } from "./FeedEmptyState";
import { FeedListView } from "./FeedListView";
import { FeedGridView } from "./FeedGridView";
import { useScrollPersistence } from "@/src/lib/hooks/useScrollPersistence";
import { useBodyClass } from "@/src/lib/hooks/useBodyClass";
import { useAuthChange } from "@/src/lib/hooks/useAuthChange";

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
      return (
        <div className="space-y-6">
          {[...Array(initialPageSize)].map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      );
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
        {renderContent()}
      </PullToRefreshWrapper>
    </div>
  );
}