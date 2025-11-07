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
      // For opening, set max-height to 0 first, then to scrollHeight after a tick
      el.style.maxHeight = '0px';
      el.classList.add('open');
      // Use requestAnimationFrame to set the height after the class is added
      requestAnimationFrame(() => {
        el.style.maxHeight = el.scrollHeight + 'px';
      });
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:card_layout_change', { detail: { state: 'opened' } })); } catch(_) {}
    } else {
      // For closing, set max-height to current scrollHeight, then to 0
      el.style.maxHeight = el.scrollHeight + 'px';
      el.classList.remove('open');
      // After a tick, set to 0
      requestAnimationFrame(() => {
        el.style.maxHeight = '0px';
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
