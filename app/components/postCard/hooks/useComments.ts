import { useState, useEffect, useRef } from "react";
import { api } from "@/src/lib/api";
import { prefetchComments, hasCachedComments, getCachedComments } from "@/src/lib/commentCache";

export function useComments(postId: string, initialCount: number) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsMounted, setCommentsMounted] = useState(false);
  const commentsRef = useRef<HTMLDivElement | null>(null);
  const [count, setCount] = useState<number>(initialCount || 0);

  // Listen for global comment-added events so counts update without opening the comments pane
  useEffect(() => {
    function onGlobalComment(e: any) {
      try {
        const pid = e?.detail?.postId;
        if (!pid) return;
        if (pid === postId) setCount(c => c + 1);
      } catch (err) { /* ignore */ }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:comment_added', onGlobalComment as any);
    }
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:comment_added', onGlobalComment as any); };
  }, [postId]);

  // Only fetch comments (either to update the visible count or to prefetch/cache)
  // when the post becomes visible (or nearly visible) to the user. This avoids
  // hitting the DB for every post on page load/refresh.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let obs: IntersectionObserver | null = null;
    let mounted = true;
    const el = document.getElementById(`post-${postId}`);
    if (!el) return;

    // If comments are already cached or comments pane mounted, nothing to do.
    if (hasCachedComments(postId) || commentsMounted) return;

    const handlePrefetch = async () => {
      try {
        await prefetchComments(postId, api.getComments as any);
        if (!mounted) return;
        // If we previously had no visible count, update it from the cached list
        const cached = getCachedComments(postId);
        if ((count || 0) === 0 && cached) {
          setCount(cached.length || 0);
        }
      } catch (_) {
        // ignore failures; we don't want to spam errors for background prefetch
      }
    };

    try {
      obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            // When the post enters view (or is within rootMargin), prefetch/cache
            // comments and update visible count if needed.
            handlePrefetch();
            if (obs) { obs.disconnect(); obs = null; }
          }
        });
      }, { rootMargin: '300px' });
      obs.observe(el);
    } catch (e) {
      // If IntersectionObserver isn't available, we avoid eager fetching so we
      // don't trigger a flood of DB requests on page load. Rely on user action
      // (hover/focus) or explicit opening of the comments pane to load comments.
    }

    // Also prefetch on pointer enter (hover) or focus for keyboard users
    const onEnter = () => {
      if (hasCachedComments(postId)) return;
      handlePrefetch();
    };
    el?.addEventListener('pointerenter', onEnter);
    el?.addEventListener('focus', onEnter);

    return () => {
      mounted = false;
      try { el?.removeEventListener('pointerenter', onEnter); el?.removeEventListener('focus', onEnter); } catch (_) {}
      if (obs) obs.disconnect();
    };
  }, [postId, commentsMounted, count]);

  // helper to set animated max-height on the comments container
  const setCommentsVisible = (open: boolean) => {
    const el = commentsRef.current;
    if (!el) return;
    // Notify listeners that layout change is starting
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:card_layout_change', { detail: { state: open ? 'opening' : 'closing' } })); } catch(_) {}
    if (open) {
      // measure and set explicit max-height so CSS can animate it
      const h = el.scrollHeight;
      // allow a small extra so inner margins/paddings don't clip
      el.style.maxHeight = h + 24 + 'px';
      // ensure the open class is present so opacity transitions
      el.classList.add('open');
      // remove any previous transitionend handlers
      const onEnd = () => { 
        el.style.maxHeight = ''; 
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:card_layout_change', { detail: { state: 'opened' } })); } catch(_) {}
        el.removeEventListener('transitionend', onEnd);
      };
      el.addEventListener('transitionend', onEnd);
    } else {
      // closing: set maxHeight to current height then to 0 so transition runs
      const h = el.scrollHeight;
      el.style.maxHeight = h + 'px';
      // Force layout so the browser notices the change before collapsing
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      el.offsetHeight;
      // remove open class after transition completes
      const onEnd = (ev: TransitionEvent) => {
        if (ev.propertyName === 'max-height' || ev.propertyName === 'max-height') {
          el.classList.remove('open');
          el.style.maxHeight = '';
          try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:card_layout_change', { detail: { state: 'closed' } })); } catch(_) {}
          el.removeEventListener('transitionend', onEnd as any);
        }
      };
      el.addEventListener('transitionend', onEnd as any);
      // trigger collapse
      el.style.maxHeight = '0px';
      el.style.opacity = '0';
    }
  };

  useEffect(() => {
    // whenever commentsOpen changes, drive the measured animation
    try { setCommentsVisible(commentsOpen); } catch (_) {}
  }, [commentsOpen]);

  return {
    commentsOpen,
    setCommentsOpen,
    commentsMounted,
    setCommentsMounted,
    commentsRef,
    count,
    setCount
  };
}
