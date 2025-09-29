"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { HydratedPost } from "@/lib/types";
import { PostCard } from "./PostCard";

export function FavoritesView() {
  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getFavoritePosts();
        setPosts(data);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="dim">Loading favorites</div>;
  if (!posts.length) return <div className="empty">No favorites yet. Tap the star on any post to save it.</div>;

  return (
    <div className="view-fade">
      <div className="feed">
        {posts.map(p => <PostCard key={p.id} post={p} />)}
      </div>
    </div>
  );
}
