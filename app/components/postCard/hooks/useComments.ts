import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { prefetchComments, hasCachedComments, getCachedComments } from "@/lib/commentCache";

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
        if (pid === postId && !commentsMounted) setCount(c => c + 1);
      } catch (err) { /* ignore */ }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:comment_added', onGlobalComment as any);
    }
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:comment_added', onGlobalComment as any); };
  }, [postId, commentsMounted]);

  // Simplified: only prefetch when comments pane is opened
  useEffect(() => {
    if (commentsMounted && !hasCachedComments(postId)) {
      prefetchComments(postId, api.getComments as any);
    }
  }, [commentsMounted, postId]);

  // helper to set animated max-height on the comments container
  const setCommentsVisible = (open: boolean) => {
    const el = commentsRef.current;
    if (!el) return;
    // Notify listeners that layout change is starting
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:card_layout_change', { detail: { state: open ? 'opening' : 'closing' } })); } catch(_) {}

    if (open) {
      // Simplified open: clear any inline max-height and add the `open`
      // class so the CSS fallback (.comments.open { max-height: 5000px })
      // handles the expansion. This avoids measuring scrollHeight on
      // first open and works even when children render asynchronously.
      try { el.style.maxHeight = ''; } catch (_) {}
      // Force a reflow to ensure the class transition runs predictably
      // in some browsers (read a layout property).
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      el.offsetHeight;
      el.classList.add('open');
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:card_layout_change', { detail: { state: 'opened' } })); } catch(_) {}
    } else {
      // Closing: capture current height, remove `open`, then animate to 0
      try { el.style.maxHeight = el.scrollHeight + 'px'; } catch (_) {}
      requestAnimationFrame(() => {
        el.classList.remove('open');
        requestAnimationFrame(() => {
          try { el.style.maxHeight = '0px'; } catch (_) {}
        });
      });
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:card_layout_change', { detail: { state: 'closed' } })); } catch(_) {}
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
