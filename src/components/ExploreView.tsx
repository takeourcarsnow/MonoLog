/* eslint-disable @next/next/no-img-element */
"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { HydratedPost } from "@/lib/types";
import Link from "next/link";

const PostCard = dynamic(() => import("./PostCard").then(m => m.PostCard), { ssr: false });

function ViewToggle({ title, selected, onSelect }: { title: string; selected: "list" | "grid"; onSelect: (v: "list" | "grid") => void }) {
  return (
    <div className="view-toggle">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <strong>{title}</strong>
        <div className="dim">All recent public posts</div>
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

export function ExploreView() {
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem("exploreView") as any)) || "grid");
  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const PAGE_SIZE = 5;
  const loadingMoreRef = useRef(false);
  const postsRef = useRef<HydratedPost[]>(posts);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(loading);
  const userInteractedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const page = await api.getExploreFeedPage({ limit: PAGE_SIZE });
        console.debug("ExploreView: loaded initial page", { len: page.length, pageSize: PAGE_SIZE });
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

  // keep a ref copy of posts so the observer callback can read the latest value
  useEffect(() => { postsRef.current = posts; }, [posts]);

  // use a callback ref for the sentinel so we can attach the observer when the
  // element actually mounts (avoids missing the element if it wasn't present
  // when the effect ran)
  const setSentinel = useCallback((el: HTMLDivElement | null) => {
    // disconnect any previous observer
    try { observerRef.current?.disconnect(); } catch (e) { /* ignore */ }
    observerRef.current = null;
    sentinelRef.current = el;
    // don't attach the observer while the initial load is in progress — this
    // avoids the initial fetch and an immediate observer-triggered fetch racing
    // and appending an extra page.
    if (!el || !hasMore || loadingRef.current) return;

    const obs = new IntersectionObserver(entries => {
      const anyIntersecting = entries.some(e => e.isIntersecting);
      if (!anyIntersecting) return;
      // require explicit user interaction (scroll/wheel/touch/keys) before
      // allowing the observer to auto-load more. This ensures a refresh that
      // mounts the sentinel inside the viewport does not immediately trigger
      // extra pages.
      if (!userInteractedRef.current) return;
      if (loadingMoreRef.current || !hasMore) return;
      (async () => {
        loadingMoreRef.current = true;
        setLoadingMore(true);
        try { obs.unobserve(el); } catch (e) { /* ignore */ }
        try {
          const last = postsRef.current[postsRef.current.length - 1];
          const before = last?.createdAt;
          const next = await api.getExploreFeedPage({ limit: PAGE_SIZE, before });
          console.debug("ExploreView: loaded next page", { len: next.length, before });
          setPosts(prev => [...prev, ...next]);
          setHasMore(next.length === PAGE_SIZE);
          if (next.length === PAGE_SIZE) try { obs.observe(el); } catch (e) { /* ignore */ }
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingMore(false);
          loadingMoreRef.current = false;
        }
      })();
    }, { rootMargin: '200px' });
    observerRef.current = obs;
    obs.observe(el);
  }, [hasMore]);

  // listen for a user interaction that implies scrolling intent. Once any
  // of these events fire, flip the flag and remove listeners.
  useEffect(() => {
    function mark() {
      userInteractedRef.current = true;
      remove();
    }
    function remove() {
      try { window.removeEventListener('scroll', mark, true); } catch (e) { }
      try { window.removeEventListener('wheel', mark, true); } catch (e) { }
      try { window.removeEventListener('touchstart', mark, true); } catch (e) { }
      try { window.removeEventListener('keydown', mark); } catch (e) { }
    }
    if (typeof window === 'undefined') return;
  window.addEventListener('scroll', mark, { passive: true } as AddEventListenerOptions);
  window.addEventListener('wheel', mark, { passive: true } as AddEventListenerOptions);
  window.addEventListener('touchstart', mark, { passive: true } as AddEventListenerOptions);
  window.addEventListener('keydown', mark);
    return () => remove();
  }, []);

  // keep loadingRef up-to-date so the callback ref can read it synchronously
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // If the sentinel existed while we were initially loading, it may not have
  // had the observer attached. Once loading completes, attach it if needed.
  useEffect(() => {
    if (!loading && sentinelRef.current && hasMore) {
      // call the callback to attach the observer
      setSentinel(sentinelRef.current);
    }
  }, [loading, hasMore, setSentinel]);

  const render = () => {
  if (loading) return <div className="card skeleton" style={{ height: 240 }} />;
  if (!posts.length) return <div className="empty">No posts yet. Be the first to post your daily photo!</div>;
    if (view === "grid") {
      return (
        <div className="grid">
          {posts.map(p => (
            <Link key={p.id} className="tile" href={`/post/${p.id}`}>
              <img
                loading="lazy"
                src={Array.isArray(p.imageUrls) ? p.imageUrls[0] : p.imageUrl}
                alt={Array.isArray(p.alt) ? p.alt[0] || "Photo" : p.alt || "Photo"}
              />
            </Link>
          ))}
          {hasMore ? <div ref={setSentinel} className="tile sentinel" aria-hidden /> : null}
        </div>
      );
    }
    return (
      <>
        {posts.map(p => <PostCard key={p.id} post={p} />)}
  {hasMore ? <div ref={setSentinel} className="feed-sentinel" /> : null}
        {loadingMore ? <div className="card skeleton" style={{ height: 120 }} /> : null}
      </>
    );
  };

  return (
    <div className="view-fade">
      <ViewToggle
        title="Explore"
        selected={view}
        onSelect={(v) => { setView(v); if (typeof window !== "undefined") localStorage.setItem("exploreView", v); }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div className="dim">Loaded: {posts.length}</div>
        {loadingMore ? <div className="dim">Loading more…</div> : null}
      </div>
      <div className="feed">{render()}</div>
    </div>
  );
}