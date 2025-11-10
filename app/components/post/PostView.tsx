"use client";

import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PostCard } from "@/app/components/PostCard";
import type { HydratedPost } from "@/lib/types";
import { usePageScroll } from "@/lib/hooks/usePageScroll";

export function PostView({ id, initialPost }: { id: string; initialPost?: HydratedPost | null }) {
  const [post, setPost] = useState<HydratedPost | null>(initialPost || null);
  const [loading, setLoading] = useState(!initialPost);
  const router = useRouter();
  
  // Enable page scrolling for the post view
  usePageScroll('post-page-scroll');

  // Allow body scrolling for post view
  useEffect(() => {
    document.body.classList.add('post-view-page');
    return () => document.body.classList.remove('post-view-page');
  }, []);

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
      {/* Back button removed to maximize media space in single-post view */}
      {loading ? null : (
  post ? <PostCard post={post} allowCarouselTouch={true} /> : <div className="empty">Post not found.</div>
      )}
    </div>
  );
}
