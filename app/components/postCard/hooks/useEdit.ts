import { useState, useRef, useEffect } from "react";
import { preloadOverlayThumbnails } from "../../imageEditor/overlaysPreload";
import { api } from "@/src/lib/api";
import { useToast } from "../../Toast";
import type { HydratedPost } from "@/src/lib/types";

export function useEdit(post: HydratedPost, setPost: (post: HydratedPost) => void) {
  const [editing, _setEditing] = useState(false);
  const lastOpenAtRef = useRef<number | null>(null);
  const pendingCloseTimerRef = useRef<number | null>(null);
  const editorOpeningRef = useRef<boolean>(false);

  // Wrap setter to debounce accidental immediate closes. Any caller that
  // tries to set editing=false within MIN_OPEN_MS of opening will be delayed
  // until the minimum time has passed. This centralizes the "flap" protection
  // so callers don't need to handle it themselves.
  const setEditing = (value: boolean) => {
  // logging removed per user request
    const MIN_OPEN_MS = 300;
    if (value) {
      // opening -> record timestamp and cancel any pending close
      lastOpenAtRef.current = Date.now();
      // mark opening synchronously so callers can detect the opening state
      editorOpeningRef.current = true;
      // clear opening flag on next tick (after render)
      window.setTimeout(() => { editorOpeningRef.current = false; }, 0);
      if (pendingCloseTimerRef.current) {
        window.clearTimeout(pendingCloseTimerRef.current);
        pendingCloseTimerRef.current = null;
      }
      // start preloading overlay thumbnails; do not block UI if preload fails
      try { preloadOverlayThumbnails().catch(() => {}); } catch {}
      _setEditing(true);
      return;
    }
    // closing -> if opened very recently, delay the close slightly
    const now = Date.now();
    const last = lastOpenAtRef.current || 0;
    const sinceOpen = now - last;
    if (sinceOpen < MIN_OPEN_MS) {
      if (pendingCloseTimerRef.current) window.clearTimeout(pendingCloseTimerRef.current);
      pendingCloseTimerRef.current = window.setTimeout(() => {
        pendingCloseTimerRef.current = null;
        _setEditing(false);
      }, MIN_OPEN_MS - sinceOpen) as unknown as number;
      return;
    }
    _setEditing(false);
  };
  const [editExpanded, setEditExpanded] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const editTimerRef = useRef<number | null>(null);
  const editorRef = useRef<{ save: () => Promise<void>; cancel?: () => void } | null>(null);
  const toast = useToast();

  const handleSave = async (patch: any) => {
    setEditorSaving(true);
    try {
      const updated = await api.updatePost(post.id, patch);
      setPost(updated);
  // debug removed
      setEditing(false);
    } catch (e: any) {
      toast.show(e?.message || "Failed to update post");
    } finally {
      setEditorSaving(false);
    }
  };

  const handleCancel = () => {
  // debug removed
    setEditing(false);
  };

  // Diagnostic: trace unexpected external edits to `editing`.
  // This prints a stack when editing becomes false so we can see who triggered it.
  // Remove or gate this in production if noisy.
  useEffect(() => {
    if (!editing) {
      // debug removed
    }
    return () => {
      // cleanup any pending timers on unmount
      if (pendingCloseTimerRef.current) { window.clearTimeout(pendingCloseTimerRef.current); pendingCloseTimerRef.current = null; }
    };
  }, [editing]);

  return {
    editing,
  setEditing,
    editExpanded,
    setEditExpanded,
    editTimerRef,
    editorSaving,
    editorRef,
    editorOpeningRef,
    handleSave,
    handleCancel
  };
}
