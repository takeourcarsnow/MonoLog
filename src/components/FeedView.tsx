/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { HydratedPost } from "@/lib/types";
import { PostCard } from "./PostCard";
import ImageZoom from "./ImageZoom";
import { useToast } from "./Toast";
import Link from "next/link";
import { ViewToggle } from "./ViewToggle";
import { tabs } from "./NavBarClient";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";

export function FeedView() {
  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem("feedView") as any)) || "list");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const PAGE_SIZE = 5;
  const loadingMoreRef = useRef(false);
  
  // Move hooks to component level for grid view
  const toast = useToast();
  const router = useRouter();
  const [overlayStates, setOverlayStates] = useState<Record<string, 'adding' | 'removing' | null>>({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const page = await api.getFollowingFeedPage({ limit: PAGE_SIZE });
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

  // Refresh feed when a new post is created (user returns to feed after upload)
  useEffect(() => {
    function onPostCreated() {
      (async () => {
        try {
          setLoading(true);
          const page = await api.getFollowingFeedPage({ limit: PAGE_SIZE });
          setPosts(page);
          setHasMore(page.length === PAGE_SIZE);
        } catch (e) { /* ignore */ } finally { setLoading(false); }
      })();
    }
    if (typeof window !== 'undefined') window.addEventListener('monolog:post_created', onPostCreated as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:post_created', onPostCreated as any); };
  }, []);

  const render = () => {
    if (loading) return <div className="card skeleton" style={{ height: 240 }} />;
    if (!posts.length) return <div className="empty">Your feed is quiet. Follow people in Explore to see their daily photo.</div>;
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
                <ImageZoom
                  loading="lazy"
                  src={Array.isArray(p.imageUrls) ? p.imageUrls[0] : p.imageUrl}
                  alt={Array.isArray(p.alt) ? p.alt[0] || "Photo" : p.alt || "Photo"}
                />
              </Link>
            </div>
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
      <ViewToggle title={<Home size={20} strokeWidth={2} />} subtitle="MonoLogs from people that you follow" selected={view} onSelect={(v) => { setView(v); if (typeof window !== "undefined") localStorage.setItem("feedView", v); }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {loadingMore ? <div className="dim">Loading more…</div> : null}
      </div>
        {loadingMore ? <div className="dim">Loading more…</div> : null}
      <div className="feed">{render()}</div>
    </div>
  );
}