"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PostCard } from "./PostCard";
import type { HydratedPost } from "@/lib/types";

export function PostView({ id }: { id: string }) {
  const [post, setPost] = useState<HydratedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // client debug
        try { console.log(`[PostView] fetching id param=${id}`); } catch (e) {}
        const p = await api.getPost(id);
        try { console.log('[PostView] api.getPost returned', !!p); } catch (e) {}
        setPost(p);
      } catch (e) {
        try { console.error('[PostView] getPost error', e); } catch (er) {}
        setPost(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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
      {loading ? <div className="dim">Loading post…</div> : (
        post ? <PostCard post={post} /> : <div className="empty">Post not found.</div>
      )}
    </div>
  );
}