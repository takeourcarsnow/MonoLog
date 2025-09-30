/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { HydratedPost } from "@/lib/types";
import { PostCard } from "./PostCard";
import Link from "next/link";
import { ViewToggle } from "./ViewToggle";

export function FeedView() {
  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem("feedView") as any)) || "list");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const PAGE_SIZE = 5;
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const page = await api.getFollowingFeedPage({ limit: PAGE_SIZE });
        console.debug("FeedView: loaded initial page", { len: page.length, pageSize: PAGE_SIZE });
        try {
          if (typeof window !== 'undefined') {
            // compact snapshot for pasting: show first few post ids and image counts
            // eslint-disable-next-line no-console
            console.debug('[FeedView] initial page snapshot', page.slice(0,6).map(p => ({ id: p.id, images: Array.isArray(p.imageUrls) ? p.imageUrls.length : (p.imageUrl ? 1 : 0), imageUrls: (p.imageUrls || p.imageUrl) ? (Array.isArray(p.imageUrls) ? p.imageUrls.slice(0,5) : [p.imageUrl]) : [] })));
          }
        } catch (e) {}
        if (!mounted) return;
        setPosts(page);
        setHasMore(page.length === PAGE_SIZE);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Refresh feed when follow/unfollow actions occur elsewhere in the app
  useEffect(() => {
    function onFollowChange(e: any) {
      try {
        // simply re-fetch the initial page to show new followed users' posts
        (async () => {
          setLoading(true);
          try {
            const page = await api.getFollowingFeedPage({ limit: PAGE_SIZE });
            setPosts(page);
            setHasMore(page.length === PAGE_SIZE);
          } catch (err) {
            console.error(err);
          } finally {
            setLoading(false);
          }
        })();
      } catch (err) { /* ignore */ }
    }
    if (typeof window !== 'undefined') window.addEventListener('monolog:follow_changed', onFollowChange as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:follow_changed', onFollowChange as any); };
  }, []);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        (async () => {
          if (!entry.isIntersecting) return;
          if (loadingMoreRef.current || !hasMore) return;
          loadingMoreRef.current = true;
          setLoadingMore(true);
          try { obs.unobserve(el); } catch (e) { /* ignore */ }
          try {
            const last = posts[posts.length - 1];
            const before = last?.createdAt;
            const next = await api.getFollowingFeedPage({ limit: PAGE_SIZE, before });
            console.debug("FeedView: loaded next page", { len: next.length, before });
              try {
                if (typeof window !== 'undefined') {
                  // eslint-disable-next-line no-console
                  console.debug('[FeedView] next page snapshot', next.slice(0,6).map(p => ({ id: p.id, images: Array.isArray(p.imageUrls) ? p.imageUrls.length : (p.imageUrl ? 1 : 0), imageUrls: (p.imageUrls || p.imageUrl) ? (Array.isArray(p.imageUrls) ? p.imageUrls.slice(0,5) : [p.imageUrl]) : [] })));
                }
              } catch (e) {}
            setPosts(prev => [...prev, ...next]);
            setHasMore(next.length === PAGE_SIZE);
          } catch (e) {
            console.error(e);
          } finally {
            setLoadingMore(false);
            loadingMoreRef.current = false;
            if (hasMore) try { obs.observe(el); } catch (e) { /* ignore */ }
          }
        })();
      });
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [posts, loadingMore, hasMore]);

  const render = () => {
    if (loading) return <div className="card skeleton" style={{ height: 240 }} />;
    if (!posts.length) return <div className="empty">Your feed is quiet. Follow people in Explore to see their daily photo.</div>;
    if (view === "grid") {
      return (
        <div className="grid">
          {posts.map(p => (
              <Link key={p.id} className="tile" href={`/post/${p.user.username || p.userId}-${p.id.slice(0,8)}`}>
              <img
                loading="lazy"
                src={Array.isArray(p.imageUrls) ? p.imageUrls[0] : p.imageUrl}
                alt={Array.isArray(p.alt) ? p.alt[0] || "Photo" : p.alt || "Photo"}
              />
            </Link>
          ))}
          {hasMore ? <div ref={sentinelRef} className="tile sentinel" aria-hidden /> : null}
        </div>
      );
    }
    return (
      <>
        {posts.map(p => <PostCard key={p.id} post={p} />)}
        {hasMore ? <div ref={sentinelRef} className="feed-sentinel" /> : null}
        {loadingMore ? <div className="card skeleton" style={{ height: 120 }} /> : null}
      </>
    );
  };

  return (
    <div className="view-fade">
      <ViewToggle title="Following" subtitle="Only people you follow" selected={view} onSelect={(v) => { setView(v); if (typeof window !== "undefined") localStorage.setItem("feedView", v); }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {loadingMore ? <div className="dim">Loading more…</div> : null}
      </div>
        {loadingMore ? <div className="dim">Loading more…</div> : null}
      <div className="feed">{render()}</div>
    </div>
  );
}