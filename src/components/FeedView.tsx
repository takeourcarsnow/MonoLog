/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
  // Keep a ref to latest posts for event handlers without re-binding
  const postsRef = useRef<HydratedPost[]>([]);
  useEffect(() => { postsRef.current = posts; }, [posts]);
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

  // Memoize the initial load function
  const loadInitialPosts = useCallback(async () => {
    setLoading(true);
    try {
      const page = await api.getFollowingFeedPage({ limit: PAGE_SIZE });
      setPosts(page);
      setHasMore(page.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await loadInitialPosts();
    })();
    return () => { mounted = false; };
  }, [loadInitialPosts]);

  // Refresh feed only when a FOLLOW action occurs elsewhere AND the newly
  // followed user's posts are not already in the current list. This prevents
  // a disruptive refetch when you quickly unfollow/refollow someone whose
  // posts are already visible (original request: avoid instant feed refresh
  // side-effects for these toggles).
  useEffect(() => {
    const onFollowChange = (e: any) => {
      try {
        const following = e?.detail?.following;
        const changedUserId = e?.detail?.userId;
        if (!following) return; // ignore unfollow events entirely

        // If the followed user's posts are already present (e.g. user unfollowed
        // then re-followed), skip refetch to avoid flicker.
        if (changedUserId && postsRef.current.some(p => p.userId === changedUserId)) return;

        // Otherwise fetch the first page again so new followed users' posts appear.
        loadInitialPosts();
      } catch (err) { /* ignore */ }
    };
    if (typeof window !== 'undefined') window.addEventListener('monolog:follow_changed', onFollowChange as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:follow_changed', onFollowChange as any); };
  }, [loadInitialPosts]);

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
    const onPostCreated = () => loadInitialPosts();
    if (typeof window !== 'undefined') window.addEventListener('monolog:post_created', onPostCreated as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:post_created', onPostCreated as any); };
  }, [loadInitialPosts]);

  // Memoize the render function to prevent unnecessary recalculations
  const render = useMemo(() => {
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
  }, [loading, posts, view, hasMore, loadingMore, overlayStates, toast, router]);

  return (
    <div className="view-fade">
      <ViewToggle title={<Home size={20} strokeWidth={2} />} subtitle="MonoLogs from you & people that you follow" selected={view} onSelect={(v) => { setView(v); if (typeof window !== "undefined") localStorage.setItem("feedView", v); }} />
      <div className={`feed ${view === 'grid' ? 'grid-view' : ''}`}>{render}</div>
    </div>
  );
}