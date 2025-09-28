"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PostCard } from "./PostCard";
import type { HydratedPost } from "@/lib/types";
import Link from "next/link";

export function PostView({ id }: { id: string }) {
  const [post, setPost] = useState<HydratedPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const p = await api.getPost(id);
      setPost(p);
      setLoading(false);
    })();
  }, [id]);

  return (
    <div className="post-view-wrap view-fade">
      <div className="toolbar"><Link className="btn" href="/profile">← Back</Link></div>
      {loading ? <div className="dim">Loading post…</div> : (
        post ? <PostCard post={post} /> : <div className="empty">Post not found.</div>
      )}
    </div>
  );
}