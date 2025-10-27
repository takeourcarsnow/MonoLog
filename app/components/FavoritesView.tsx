"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/src/lib/api";
import type { HydratedPost } from "@/src/lib/types";
import { PostCard } from "./PostCard";
import { SkeletonCard, SkeletonTile } from "./Skeleton";
import { useEventListener } from "@/src/lib/hooks/useEventListener";
import { useDataFetch } from "@/src/lib/hooks/useDataFetch";
import { usePageScroll } from "@/src/lib/hooks/usePageScroll";
import { Star as StarIcon } from "lucide-react";
import Link from "next/link";
import { ViewToggle } from "./ViewToggle";
import { GridView } from "./GridView";

export function FavoritesView() {
  usePageScroll('favorites-page-scroll');
  const { data: posts, setData: setPosts, loading, refetch: loadFavorites } = useDataFetch(
    () => api.getFavoritePosts(),
    []
  );
  // Debug: log posts when changed so we can confirm UI receives API data
  useEffect(() => {
    try {
      if (posts && Array.isArray(posts)) {
        console.log('FavoritesView received posts:', posts.length, posts.map(p => p.id));
      }
    } catch (e) {}
  }, [posts]);
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem("favoritesView") as any)) || "list");

  // Handle favorite changes optimistically
  useEventListener('monolog:favorite_changed', (e: any) => {
    console.log('Favorite changed event:', e?.detail);
    const changedPostId = e?.detail?.postId;
    const favorited = e?.detail?.favorited;
    if (!changedPostId) return;

    if (!favorited) {
      // Unfavorited: remove from list
      setPosts(prev => prev.filter(p => p.id !== changedPostId));
    } else {
      // Favorited: add to list (but we don't have the post data here, so refetch)
      loadFavorites();
    }
  }, [loadFavorites]);

  // Listen for a direct post payload when a post is favorited so we can
  // append without refetching the entire list.
  useEventListener('monolog:favorite_added', (e: any) => {
    try {
      const p: HydratedPost | undefined = e?.detail?.post;
      if (!p || !p.id) return;
      // Only add if not present
      setPosts(prev => {
        if (!prev) return [p];
        if (prev.some(x => x.id === p.id)) return prev;
        return [p, ...prev];
      });
    } catch (e) {}
  }, []);

  if (loading) {
    return (
      <div className="view-fade">
        <SkeletonCard height={120} maxWidth={800} margin="24px auto" />
        <div className="grid" aria-label="Loading posts">
          <SkeletonTile height={160} count={3} />
        </div>
      </div>
    );
  }
  if (!posts.length) {
    return (
      <div className="view-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - var(--header-height))' }}>
        <div className="empty feed-empty" style={{ textAlign: 'center' }}>
          <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', borderRadius: 16 }} aria-hidden>
              <StarIcon size={56} strokeWidth={1.5} />
            </div>

            <h2 style={{ margin: '6px 0 0 0', fontSize: '1.15rem' }}>No favorites yet</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 420 }}>Tap the star on any post to save it here.</p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-fade">
      {posts.length > 0 && (
        <ViewToggle title={<StarIcon size={20} strokeWidth={2} />} subtitle="Your favorite posts" selected={view} onSelect={(v) => { setView(v); if (typeof window !== "undefined") localStorage.setItem("favoritesView", v); }} />
      )}
      <div className={`feed ${view === 'grid' ? 'grid-view' : ''}`}>
        {view === 'list' ? (
          posts.map(p => <PostCard key={p.id} post={p} />)
        ) : (
          <GridView posts={posts} hasMore={false} setSentinel={() => {}} />
        )}
      </div>
    </div>
  );
}
