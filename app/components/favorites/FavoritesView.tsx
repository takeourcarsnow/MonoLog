"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type { HydratedPost } from "@/lib/types";
import { PostCard } from "@/app/components/PostCard";
import { SkeletonCard, SkeletonTile } from "@/app/components/ui/Skeleton";
import { useEventListener } from "@/lib/hooks/useEventListener";
import { useDataFetch } from "@/lib/hooks/useDataFetch";
import { usePageScroll } from "@/lib/hooks/usePageScroll";
import { Star as StarIcon } from "lucide-react";
import Link from "next/link";
import { ViewToggle } from "@/app/components/ui/ViewToggle";
import { GridView } from "@/app/components/feed/GridView";

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
      if (typeof window !== "undefined") localStorage.setItem("favoritesView", v);
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
      if (typeof window !== "undefined") localStorage.setItem("favoritesView", v);
      requestAnimationFrame(() => { setIsTransitioning(false); });
      cleanupRef.current = null;
    };
    el.addEventListener('animationend', onEnd as any);
    cleanupRef.current = () => {
      try { el.removeEventListener('animationend', onEnd as any); } catch {}
      setIsTransitioning(false);
    };
    requestAnimationFrame(() => {});
  }, [view]);

  useEffect(() => {
    return () => { if (cleanupRef.current) { try { cleanupRef.current(); } catch {} } };
  }, []);

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
        <ViewToggle title={<StarIcon size={20} strokeWidth={2} />} subtitle="Your favorite posts" selected={pendingView ?? view} onSelect={handleViewChange} />
      )}
      <div ref={fadeRef} className={`feed ${view === 'grid' ? 'grid-view' : ''} fade-anim ${isTransitioning ? 'fade-hidden' : 'fade-visible'}`}>
        {view === 'list' ? (
          posts.map((p, index) => <PostCard key={p.id} post={p} index={index} />)
        ) : (
          <GridView posts={posts} hasMore={false} setSentinel={() => {}} />
        )}
      </div>
    </div>
  );
}

