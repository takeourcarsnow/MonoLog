import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/src/lib/api";
import { useToast } from "../../Toast";

export function useDelete(postId: string) {
  const [deleteExpanded, setDeleteExpanded] = useState(false);
  const [showConfirmText, setShowConfirmText] = useState(false);
  const [isPressingDelete, setIsPressingDelete] = useState(false);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const deleteExpandTimerRef = useRef<number | null>(null);
  const deleteBtnRef = useRef<HTMLButtonElement | null>(null);
  const touchActivatedRef = useRef(false);
  const deleteHandlerRef = useRef<(() => void) | null>(null);
  const focusSinkRef = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  // cleanup any pending delete expand timer when component unmounts
  useEffect(() => {
    return () => {
      if (deleteExpandTimerRef.current) { try { window.clearTimeout(deleteExpandTimerRef.current); } catch (_) {} deleteExpandTimerRef.current = null; }
    };
  }, []);

  // Some mobile browsers apply focus after touch/click events (timing can be
  // inconsistent). Add a capture-phase focusin listener and document-level
  // pointer/touchend handlers to ensure the delete button never keeps focus.
  useEffect(() => {
    const el = deleteBtnRef.current;
    if (!el) return;

    const tryBlur = () => {
      try { (el as HTMLElement).blur?.(); } catch (_) {}
      try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
      // Also attempt to focus a hidden focus sink to move focus away reliably
      try {
        const sink = focusSinkRef.current;
        if (sink) {
          sink.focus();
          // blur the sink shortly after
          setTimeout(() => { try { sink.blur(); } catch (_) {} }, 0);
        }
      } catch (_) {}
    };

    const onFocusIn = (ev: FocusEvent) => {
      try {
        if (ev.target === el) {
          // Defer slightly to handle browsers that move focus after the event
          setTimeout(tryBlur, 0);
        }
      } catch (_) { }
    };

    const onDocPointerUp = (ev: PointerEvent) => {
      try {
        const tgt = ev.target as Node | null;
        // Only run tryBlur when the pointerup happened on the delete button
        // or within it (e.g., composedPath for shadow DOM)
        const path = (ev.composedPath && ev.composedPath()) || [];
        if (tgt === el || path.indexOf(el as any) >= 0) {
          setTimeout(tryBlur, 0);
        }
      } catch (_) {}
    };
    const onDocTouchEnd = (ev: TouchEvent) => {
      try {
        const tgt = ev.target as Node | null;
        const path = (ev.composedPath && ev.composedPath()) || [];
        if (tgt === el || path.indexOf(el as any) >= 0) {
          setTimeout(tryBlur, 0);
        }
      } catch (_) {}
    };

  document.addEventListener('focusin', onFocusIn as any, true);
  document.addEventListener('pointerup', onDocPointerUp);
  document.addEventListener('touchend', onDocTouchEnd);

    return () => {
  try { document.removeEventListener('focusin', onFocusIn as any, true); } catch (_) {}
  try { document.removeEventListener('pointerup', onDocPointerUp); } catch (_) {}
  try { document.removeEventListener('touchend', onDocTouchEnd); } catch (_) {}
    };
  }, []);

  // Create a hidden focus sink element appended to body to use as a reliable
  // target for stealing focus when mobile browsers re-focus the delete control.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sink = document.createElement('div');
    sink.tabIndex = -1;
    sink.setAttribute('aria-hidden', 'true');
    // keep it visually hidden but focusable
    sink.style.position = 'fixed';
    sink.style.left = '-9999px';
    sink.style.width = '1px';
    sink.style.height = '1px';
    sink.style.overflow = 'hidden';
    document.body.appendChild(sink);
    focusSinkRef.current = sink;
    return () => {
      try { focusSinkRef.current = null; document.body.removeChild(sink); } catch (_) {}
    };
  }, []);

  // Attach a native non-passive touchstart/end listener to the delete button so we can
  // handle activation on mobile (avoid relying on browser focus timing). We call the
  // latest handler via deleteHandlerRef to avoid stale closures.
  useEffect(() => {
    const el = deleteBtnRef.current;
    if (!el) return;
    const onTouchStartNative = (ev: TouchEvent) => {
      try { ev.preventDefault(); } catch (_) {}
      touchActivatedRef.current = true;
      try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
      try { (el as HTMLElement).blur?.(); } catch (_) {}
      try { setIsPressingDelete(true); } catch (_) {}
    };
    const onTouchEndNative = (ev: TouchEvent) => {
      try { setIsPressingDelete(false); } catch (_) {}
      try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
      try { (el as HTMLElement).blur?.(); } catch (_) {}
      // If a touch activation started on this element, call the React handler path
      try {
        if (touchActivatedRef.current && deleteHandlerRef.current) {
          // Defer so React state updates are applied consistently
          setTimeout(() => { try { deleteHandlerRef.current && deleteHandlerRef.current(); } catch (_) {} }, 0);
        }
      } catch (_) {}
      touchActivatedRef.current = false;
    };
    // passive: false so preventDefault is allowed
    el.addEventListener('touchstart', onTouchStartNative as EventListener, { passive: false });
    el.addEventListener('touchend', onTouchEndNative as EventListener);
    el.addEventListener('touchcancel', onTouchEndNative as EventListener);
    return () => {
      try { el.removeEventListener('touchstart', onTouchStartNative as any); } catch (_) {}
      try { el.removeEventListener('touchend', onTouchEndNative as any); } catch (_) {}
      try { el.removeEventListener('touchcancel', onTouchEndNative as any); } catch (_) {}
    };
  }, []);

  // Centralized delete activation handler used by both React onClick and native touchend
  const handleDeleteActivation = async () => {
    // Immediately remove focus from any element so the delete control never stays focused
    try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
    try { setTimeout(() => { document.body.dispatchEvent(new MouseEvent('click', { bubbles: true })); }, 0); } catch (_) {}
    // Aggressively steal focus to a hidden sink for a few micro-ticks to handle
    // mobile browsers that re-apply focus after the event loop.
    try {
      const sink = focusSinkRef.current;
      if (sink) {
        // schedule multiple focus/blur cycles to cover delayed re-focus behaviors
        const delays = [0, 8, 40, 120, 400, 900];
        for (const d of delays) {
          setTimeout(() => {
            try { sink.focus(); sink.blur(); } catch (_) {}
            try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
          }, d);
        }
      }
    } catch (_) {}

    // Clear pressing visual state
    try { setIsPressingDelete(false); } catch (_) {}

    // If already expanded, proceed to delete
    if (deleteExpanded) {
      try {
        (document.getElementById(`post-${postId}`)?.remove?.());
        await api.deletePost(postId);
        // Dispatch event to notify other components (e.g., feed) that post was deleted
        window.dispatchEvent(new CustomEvent('monolog:post_deleted', { detail: { postId } }));
        if (pathname?.startsWith("/post/")) router.push("/");
      } catch (e: any) {
        toast.show(e?.message || "Failed to delete post");
      } finally {
        setDeleteExpanded(false);
        setShowConfirmText(false);
        if (deleteExpandTimerRef.current) { window.clearTimeout(deleteExpandTimerRef.current); deleteExpandTimerRef.current = null; }
      }
      return;
    }

    // Enter expanded state and clear after timeout
    setDeleteExpanded(true);
    setShowConfirmText(true);
    if (deleteExpandTimerRef.current) { window.clearTimeout(deleteExpandTimerRef.current); deleteExpandTimerRef.current = null; }
    deleteExpandTimerRef.current = window.setTimeout(() => { 
      setDeleteExpanded(false); 
      // Keep text as "Confirm" during collapse animation (220ms)
      window.setTimeout(() => setShowConfirmText(false), 220);
      deleteExpandTimerRef.current = null; 
    }, 3500);
  // final snapshot a little later (no debug log)
  setTimeout(() => { try { /* noop */ } catch (_) {} }, 1200);
  };

  // keep a live reference so native listeners can call the latest handler
  deleteHandlerRef.current = handleDeleteActivation;

  return {
    deleteExpanded,
    setDeleteExpanded,
    showConfirmText,
    deleteExpandTimerRef,
    isPressingDelete,
    setIsPressingDelete,
    overlayEnabled,
    setOverlayEnabled,
    deleteBtnRef,
    deleteHandlerRef,
    handleDeleteActivation
  };
}
