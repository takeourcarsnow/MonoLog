/* eslint-disable @next/next/no-img-element */
"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/src/lib/api";
import type { HydratedPost } from "@/src/lib/types";
import Link from "next/link";
import { ViewToggle } from "./ViewToggle";
import { useToast } from "./Toast";
import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";

const PostCard = dynamic(() => import("./PostCard").then(m => m.PostCard), { ssr: false });

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
  
  // Move hooks to component level for grid view
  const toast = useToast();
  const router = useRouter();
  const [overlayStates, setOverlayStates] = useState<Record<string, 'adding' | 'removing' | null>>({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const page = await api.getExploreFeedPage({ limit: PAGE_SIZE });
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
      if (loadingMoreRef.current || !hasMore) return;
      (async () => {
        loadingMoreRef.current = true;
        setLoadingMore(true);
        try { obs.unobserve(el); } catch (e) { /* ignore */ }
        try {
          const last = postsRef.current[postsRef.current.length - 1];
          const before = last?.createdAt;
          const next = await api.getExploreFeedPage({ limit: PAGE_SIZE, before });
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

  // Remove deleted post from explore feed immediately
  useEffect(() => {
    const onPostDeleted = (e: any) => {
      const deletedPostId = e?.detail?.postId;
      if (deletedPostId) {
        setPosts(prev => prev.filter(p => p.id !== deletedPostId));
      }
    };
    if (typeof window !== 'undefined') window.addEventListener('monolog:post_deleted', onPostDeleted as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:post_deleted', onPostDeleted as any); };
  }, []);

  // Refresh explore when a new post is created (user returns to explore after upload)
  useEffect(() => {
    const onPostCreated = () => {
      // For explore, we can refetch the initial page to include new public posts
      setLoading(true);
      (async () => {
        try {
          const page = await api.getExploreFeedPage({ limit: PAGE_SIZE });
          setPosts(page);
          setHasMore(page.length === PAGE_SIZE);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      })();
    };
    if (typeof window !== 'undefined') window.addEventListener('monolog:post_created', onPostCreated as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:post_created', onPostCreated as any); };
  }, []);

  const render = () => {
  if (loading) return <div className="card skeleton" style={{ height: 240 }} />;
  if (!posts.length) return <div className="empty">No posts yet. Be the first to post your daily photo!</div>;
    if (view === "grid") {
      const clickCounts = new Map<string, number>();
      const clickTimers = new Map<string, any>();
      const dblClickFlags = new Map<string, boolean>();

      const showOverlay = (postId: string, action: 'adding' | 'removing') => {
        setOverlayStates(prev => ({ ...prev, [postId]: action }));
        const duration = action === 'adding' ? 600 : 500;
        setTimeout(() => {
          setOverlayStates(prev => ({ ...prev, [postId]: null }));
        }, duration);
      };

      const handleTileClick = (e: React.MouseEvent, post: HydratedPost) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (dblClickFlags.get(post.id)) return;
        
        const href = `/post/${post.user.username || post.userId}-${post.id.slice(0,8)}`;
        const count = (clickCounts.get(post.id) || 0) + 1;
        clickCounts.set(post.id, count);
        
        if (count === 1) {
          const timer = setTimeout(() => {
            if (!dblClickFlags.get(post.id)) {
              try { router.push(href); } catch (_) {}
            }
            clickCounts.set(post.id, 0);
            dblClickFlags.delete(post.id);
          }, 280);
          clickTimers.set(post.id, timer);
        }
      };

      const handleTileDblClick = async (e: React.MouseEvent, post: HydratedPost) => {
        e.preventDefault();
        e.stopPropagation();
        
        dblClickFlags.set(post.id, true);
        
        const timer = clickTimers.get(post.id);
        if (timer) {
          clearTimeout(timer);
          clickTimers.delete(post.id);
        }
        
        clickCounts.set(post.id, 0);
        
        try {
          const cur = await api.getCurrentUser();
          if (!cur) { toast.show('Sign in to favorite'); return; }
          
          // Check if already favorited to toggle properly
          const isFav = await api.isFavorite(post.id);
          if (isFav) {
            await api.unfavoritePost(post.id);
            toast.show('Removed from favorites');
            showOverlay(post.id, 'removing');
          } else {
            await api.favoritePost(post.id);
            toast.show('Added to favorites');
            showOverlay(post.id, 'adding');
          }
        } catch (e:any) {
          toast.show(e?.message || 'Failed');
        }
        
        setTimeout(() => {
          dblClickFlags.delete(post.id);
        }, 400);
      };

      return (
        <div className="grid">
          {posts.map(p => (
            <div 
              key={p.id} 
              className="tile" 
              onClick={(e) => handleTileClick(e, p)} 
              onDoubleClick={(e) => handleTileDblClick(e, p)} 
              role="button" 
              tabIndex={0} 
              onKeyDown={(e) => { if (e.key==='Enter') handleTileClick(e as any, p); }}
              style={{ position: 'relative' }}
            >
              {overlayStates[p.id] && (
                <div className={`favorite-overlay ${overlayStates[p.id]}`} aria-hidden="true">
                  ★
                </div>
              )}
              <Link aria-hidden href={`/post/${p.user.username || p.userId}-${p.id.slice(0,8)}`} prefetch={false} style={{ display:'contents' }} onClick={(e)=> e.preventDefault()}>
                <img
                  loading="lazy"
                  src={Array.isArray(p.imageUrls) ? p.imageUrls[0] : p.imageUrl}
                  alt={Array.isArray(p.alt) ? p.alt[0] || "Photo" : p.alt || "Photo"}
                />
              </Link>
            </div>
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
        title={<Compass size={20} strokeWidth={2} />}
        subtitle="MonoLogs from people you aren't following yet"
        selected={view}
        onSelect={(v) => { setView(v); if (typeof window !== "undefined") localStorage.setItem("exploreView", v); }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }} />
      {/* hint removed per user request */}
      <div className={`feed ${view === 'grid' ? 'grid-view' : ''}`}>{render()}</div>
    </div>
  );
}
