import { useState, useEffect, useRef } from "react";
import { api } from "@/src/lib/api";
import { prefetchComments, hasCachedComments } from "@/src/lib/commentCache";

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

  // If the initial hydrated post didn't include a commentsCount (or it's 0),
  // fetch the comments once to ensure the visible count is accurate. This
  // guards against server queries that omit the comments relation.
  useEffect(() => {
    let mounted = true;
    // Only do this when the currently-displayed count is falsy and comments
    // pane isn't already mounted (which would load comments). This avoids
    // unnecessary duplicate requests.
    if ((count || 0) > 0) return;
    if (commentsMounted) return;
    (async () => {
      try {
        const list = await api.getComments(postId);
        if (!mounted) return;
        setCount(list.length || 0);
      } catch (e) {
        // ignore failures; leave count as-is
      }
    })();
    return () => { mounted = false; };
  }, [postId, count, commentsMounted]);

  // Prefetch comments in the background when the post becomes visible or hovered
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let obs: IntersectionObserver | null = null;
    const el = document.getElementById(`post-${postId}`);
    // Only prefetch when we have an element and comments aren't already cached.
    // Previously we required count > 0; change that so we can proactively
    // prefetch when a post appears in the feed even if the initial count is 0.
    if (!el || hasCachedComments(postId)) return;
    try {
      obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            // background prefetch; don't await
            prefetchComments(postId, api.getComments as any).catch(() => {});
            if (obs) { obs.disconnect(); obs = null; }
          }
        });
      }, { rootMargin: '300px' });
      obs.observe(el);
    } catch (e) {
      // Fallback: if IntersectionObserver unsupported, prefetch after brief idle
      try { setTimeout(() => prefetchComments(postId, api.getComments as any).catch(() => {}), 800); } catch (_) {}
    }

    // Also prefetch on pointer enter (hover) or focus for keyboard users
    const onEnter = () => {
      if (hasCachedComments(postId)) return;
      prefetchComments(postId, api.getComments as any).catch(() => {});
    };
    el?.addEventListener('pointerenter', onEnter);
    el?.addEventListener('focus', onEnter);

    return () => {
      try { el?.removeEventListener('pointerenter', onEnter); el?.removeEventListener('focus', onEnter); } catch (_) {}
      if (obs) obs.disconnect();
    };
  }, [postId, count]);

  // helper to set animated max-height on the comments container
  const setCommentsVisible = (open: boolean) => {
    const el = commentsRef.current;
    if (!el) return;
    if (open) {
      // measure and set explicit max-height so CSS can animate it
      const h = el.scrollHeight;
      // allow a small extra so inner margins/paddings don't clip
      el.style.maxHeight = h + 24 + 'px';
      // ensure the open class is present so opacity transitions
      el.classList.add('open');
      // remove any previous transitionend handlers
      const onEnd = () => { el.style.maxHeight = ''; el.removeEventListener('transitionend', onEnd); };
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
