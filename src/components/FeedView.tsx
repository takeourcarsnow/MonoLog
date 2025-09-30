/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { HydratedPost } from "@/lib/types";
import { PostCard } from "./PostCard";
import Link from "next/link";

function ViewToggle({ selected, onSelect }: { selected: "list" | "grid"; onSelect: (v: "list" | "grid") => void }) {
  return (
    <div className="view-toggle">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <strong>Following</strong>
        <div className="dim">Only people you follow</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          className={`btn ${selected === "list" ? "primary" : ""}`}
          onClick={() => onSelect("list")}
          title="List view"
          aria-pressed={selected === "list"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <rect x="3" y="5" width="4" height="4" rx="1" />
            <rect x="3" y="11" width="4" height="4" rx="1" />
            <rect x="3" y="17" width="4" height="4" rx="1" />
          </svg>
          <span className="sr-only">List view</span>
        </button>
        <button
          className={`btn ${selected === "grid" ? "primary" : ""}`}
          onClick={() => onSelect("grid")}
          title="Grid view"
          aria-pressed={selected === "grid"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="8" height="8" rx="1" />
            <rect x="13" y="3" width="8" height="8" rx="1" />
            <rect x="3" y="13" width="8" height="8" rx="1" />
            <rect x="13" y="13" width="8" height="8" rx="1" />
          </svg>
          <span className="sr-only">Grid view</span>
        </button>
      </div>
    </div>
  );
}

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
      <ViewToggle selected={view} onSelect={(v) => { setView(v); if (typeof window !== "undefined") localStorage.setItem("feedView", v); }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {loadingMore ? <div className="dim">Loading more…</div> : null}
      </div>
        {loadingMore ? <div className="dim">Loading more…</div> : null}
      <div className="feed">{render()}</div>
    </div>
  );
}