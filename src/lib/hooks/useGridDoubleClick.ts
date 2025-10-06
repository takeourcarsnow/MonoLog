import { useRef, useCallback } from "react";
import { api } from "@/src/lib/api";
import type { HydratedPost } from "@/src/lib/types";

interface UseGridDoubleClickOptions {
  onShowOverlay?: (postId: string, action: 'adding' | 'removing') => void;
}

export function useGridDoubleClick(toast: any, router: any, options: UseGridDoubleClickOptions = {}) {
  const { onShowOverlay } = options;

  const clickCountsRef = useRef(new Map<string, number>());
  const clickTimersRef = useRef(new Map<string, any>());
  const dblClickFlagsRef = useRef(new Map<string, boolean>());
  const overlayTimeoutsRef = useRef(new Map<string, any>());

  const showOverlay = useCallback((postId: string, action: 'adding' | 'removing') => {
    // Clear any existing timeout for this post
    const existingTimeout = overlayTimeoutsRef.current.get(postId);
    if (existingTimeout) clearTimeout(existingTimeout);

    const duration = action === 'adding' ? 600 : 500;
    const timeout = setTimeout(() => {
      overlayTimeoutsRef.current.delete(postId);
    }, duration);
    overlayTimeoutsRef.current.set(postId, timeout);

    onShowOverlay?.(postId, action);
  }, [onShowOverlay]);

  const handleTileClick = useCallback((e: React.MouseEvent, post: HydratedPost) => {
    e.preventDefault();
    e.stopPropagation();

    if (dblClickFlagsRef.current.get(post.id)) return;

    const href = `/post/${post.user.username || post.userId}-${post.id.slice(0,8)}`;
    const count = (clickCountsRef.current.get(post.id) || 0) + 1;
    clickCountsRef.current.set(post.id, count);

    if (count === 1) {
      const timer = setTimeout(() => {
        if (!dblClickFlagsRef.current.get(post.id)) {
          try { router.push(href); } catch (_) {}
        }
        clickCountsRef.current.set(post.id, 0);
        dblClickFlagsRef.current.delete(post.id);
      }, 280);
      clickTimersRef.current.set(post.id, timer);
    }
  }, [router]);

  const handleTileDblClick = useCallback(async (e: React.MouseEvent, post: HydratedPost) => {
    e.preventDefault();
    e.stopPropagation();

    dblClickFlagsRef.current.set(post.id, true);

    const timer = clickTimersRef.current.get(post.id);
    if (timer) {
      clearTimeout(timer);
      clickTimersRef.current.delete(post.id);
    }

    clickCountsRef.current.set(post.id, 0);

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
      dblClickFlagsRef.current.delete(post.id);
    }, 400);
  }, [toast, showOverlay]);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear all timers
    clickTimersRef.current.forEach(timer => clearTimeout(timer));
    clickTimersRef.current.clear();

    overlayTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    overlayTimeoutsRef.current.clear();

    clickCountsRef.current.clear();
    dblClickFlagsRef.current.clear();
  }, []);

  return { handleTileClick, handleTileDblClick, showOverlay, cleanup };
}