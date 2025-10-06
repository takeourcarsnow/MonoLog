/* eslint-disable @next/next/no-img-element */
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/src/lib/api";
import type { HydratedPost } from "@/src/lib/types";
import Link from "next/link";
import { ViewToggle } from "./ViewToggle";
import { useToast } from "./Toast";
import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";
import { useFeed } from "@/src/lib/hooks/useFeed";
import { usePullToRefresh } from "@/src/lib/hooks/usePullToRefresh";
import { GridView } from "./GridView";
import { PullToRefreshWrapper } from "./PullToRefresh";
import { InfiniteScrollLoader } from "./LoadingIndicator";

const PostCard = dynamic(() => import("./PostCard").then(m => m.PostCard), { ssr: false });

export function ExploreView() {
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem("exploreView") as any)) || "grid");

  const fetchExploreFeed = useCallback((opts: { limit: number; before?: string }) => api.getExploreFeedPage(opts), []);

  const { posts, loading, loadingMore, hasMore, error, loadInitialPosts, refresh, setSentinel } = useFeed(
    fetchExploreFeed,
    { pageSize: 5 }
  );

  const { isRefreshing, pullDistance, isPulling, containerRef, getPullStyles } = usePullToRefresh({
    threshold: 80,
    onRefresh: refresh,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (mounted) await loadInitialPosts();
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { mounted = false; };
  }, [loadInitialPosts]);

  // Refresh explore when a new post is created (user returns to explore after upload)
  useEffect(() => {
    const onPostCreated = () => {
      // For explore, we can refetch the initial page to include new public posts
      loadInitialPosts();
    };
    if (typeof window !== 'undefined') window.addEventListener('monolog:post_created', onPostCreated as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:post_created', onPostCreated as any); };
  }, [loadInitialPosts]);

  const render = () => {
    if (loading) return <div className="card skeleton" style={{ height: 240 }} />;
    if (!posts.length) return <div className="empty">No posts yet. Be the first to post your daily photo!</div>;
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
            const sentinel = document.querySelector('.feed-sentinel');
            if (sentinel) {
              setSentinel(sentinel as HTMLDivElement);
            }
          }}
        />
      </>
    );
  };

  return (
    <div className="view-fade">
      <ViewToggle
        title={<Compass size={20} strokeWidth={2} />}
        subtitle="MonoLogs from people you aren't following yet"
        selected={view}
        onSelect={(v) => { setView(v); if (typeof window !== "undefined") localStorage.setItem("exploreView", v); }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }} />
      <PullToRefreshWrapper
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        threshold={80}
        containerRef={containerRef}
        getPullStyles={getPullStyles}
        className={`feed ${view === 'grid' ? 'grid-view' : ''}`}
      >
        {render()}
      </PullToRefreshWrapper>
    </div>
  );
}
