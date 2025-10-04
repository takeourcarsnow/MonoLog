"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PostCard } from "./PostCard";
import type { HydratedPost } from "@/lib/types";

export function PostView({ id, initialPost }: { id: string; initialPost?: HydratedPost | null }) {
  const [post, setPost] = useState<HydratedPost | null>(initialPost || null);
  const [loading, setLoading] = useState(!initialPost);
  const router = useRouter();

  useEffect(() => {
    // If we already have initialPost, skip fetching
    if (initialPost) return;
    
    (async () => {
      try {
        // client debug
  const p = await api.getPost(id);
        setPost(p);
      } catch (e) {
        try { console.error('[PostView] getPost error', e); } catch (er) {}
        setPost(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, initialPost]);

  const goBack = () => {
    // If there's a meaningful history, go back. Otherwise, fall back to Explore.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/explore");
    }
  };

  return (
    <div className="post-view-wrap view-fade">
      <div className="toolbar">
        <button className="btn" onClick={goBack}>← Back</button>
      </div>
      {loading ? (
        <div className="card skeleton" style={{ height: 400, maxWidth: 800, margin: '24px auto' }} />
      ) : (
  post ? <PostCard post={post} allowCarouselTouch={true} /> : <div className="empty">Post not found.</div>
      )}
    </div>
  );
}