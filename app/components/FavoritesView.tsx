"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/src/lib/api";
import type { HydratedPost } from "@/src/lib/types";
import { PostCard } from "./PostCard";
import { SkeletonCard, SkeletonTile } from "./Skeleton";
import { useEventListener } from "@/src/lib/hooks/useEventListener";
import { Star as StarIcon } from "lucide-react";
import Link from "next/link";
import { ViewToggle } from "./ViewToggle";
import { GridView } from "./GridView";

export function FavoritesView() {
  // Ensure the page can scroll: some layout rules set overflow:hidden on
  // the root/html to implement internal scrolling. When this view mounts
  // we add a class that enables body/html scrolling (and the .content
  // fallback). Remove it on unmount.
  useEffect(() => {
    try {
      document.documentElement.classList.add('favorites-page-scroll');
      document.body.classList.add('favorites-page-scroll');
    } catch (e) {}
    return () => {
      try {
        document.documentElement.classList.remove('favorites-page-scroll');
        document.body.classList.remove('favorites-page-scroll');
      } catch (e) {}
    };
  }, []);
  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem("favoritesView") as any)) || "list");

  const loadFavorites = useCallback(async () => {
    try {
      const data = await api.getFavoritePosts();
      setPosts(data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Handle favorite changes optimistically
  useEventListener('monolog:favorite_changed', (e: any) => {
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
      <div className="view-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
