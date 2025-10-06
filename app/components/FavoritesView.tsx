"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/src/lib/api";
import type { HydratedPost } from "@/src/lib/types";
import { PostCard } from "./PostCard";

export function FavoritesView() {
  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [loading, setLoading] = useState(true);

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
  useEffect(() => {
    const onFavoriteChanged = (e: any) => {
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
    };
    if (typeof window !== 'undefined') window.addEventListener('monolog:favorite_changed', onFavoriteChanged as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:favorite_changed', onFavoriteChanged as any); };
  }, [loadFavorites]);

  if (loading) {
    return (
      <div className="view-fade">
        <div className="card skeleton" style={{ height: 120, maxWidth: 800, margin: '24px auto' }} />
        <div className="grid" aria-label="Loading posts">
          <div className="tile skeleton" style={{ height: 160 }} />
          <div className="tile skeleton" style={{ height: 160 }} />
          <div className="tile skeleton" style={{ height: 160 }} />
        </div>
      </div>
    );
  }
  if (!posts.length) return <div className="empty">No favorites yet. Tap the star on any post to save it.</div>;

  return (
    <div className="view-fade">
      <div className="feed">
        {posts.map(p => <PostCard key={p.id} post={p} />)}
      </div>
    </div>
  );
}
