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
      // Let CSS handle the animation - just add the open class
      el.classList.add('open');
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:card_layout_change', { detail: { state: 'opened' } })); } catch(_) {}
    } else {
      // For closing, let CSS handle the transition
      el.classList.remove('open');
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
