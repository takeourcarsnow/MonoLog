"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { EDITING_SESSION_KEY } from "./constants";

export function useUploaderEffects(
  pathname: string,
  editing: boolean,
  editingAlt: string,
  editingIndex: number,
  setProcessing: (processing: boolean) => void,
  setEditing: (editing: boolean) => void,
  setEditingIndex: (index: number) => void,
  setEditingAlt: (alt: string) => void,
  setIndex: (index: number) => void,
  setJustDiscarded: (discarded: boolean) => void,
  dataUrls: string[],
  alt: string | string[],
  canPost: boolean | null,
  hasPreview: boolean,
  attemptedEditorRestoreRef: React.MutableRefObject<boolean>,
  index: number
) {
  // Ensure we don't show a stale "processing" loader when navigating back
  useEffect(() => {
    if (pathname === '/upload') {
      setProcessing(false);
    }
  }, [pathname, setProcessing]);

  // Clear processing when a post is created elsewhere in the app
  useEffect(() => {
    const onPostCreated = () => setProcessing(false);
    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:post_created', onPostCreated as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('monolog:post_created', onPostCreated as EventListener);
      }
    };
  }, [setProcessing]);

  // Close editor automatically if user navigates away from /upload
  useEffect(() => {
    if (editing && pathname !== '/upload') {
      try {
        sessionStorage.setItem(EDITING_SESSION_KEY, JSON.stringify({ open: true, index: editingIndex, alt: editingAlt }));
      } catch {}
      setEditing(false);
    }
  }, [pathname, editing, editingAlt, editingIndex, setEditing]);

  // Persist or clear the session flag whenever editing state changes
  useEffect(() => {
    try {
      if (editing) {
        sessionStorage.setItem(EDITING_SESSION_KEY, JSON.stringify({ open: true, index: editingIndex, alt: editingAlt }));
      }
      // Don't remove here, only when explicitly closed
    } catch {}
  }, [editing, editingIndex, editingAlt, pathname]);

  // One-time restoration of editor state after returning to /upload
  useEffect(() => {
    if (pathname !== '/upload') {
      attemptedEditorRestoreRef.current = false;
      return;
    }
    if (attemptedEditorRestoreRef.current) return;
    if (editing) { attemptedEditorRestoreRef.current = true; return; }
    if (!(dataUrls.length > 0)) return;
    try {
      const raw = sessionStorage.getItem(EDITING_SESSION_KEY);
      if (!raw) { attemptedEditorRestoreRef.current = true; return; }
      const parsed = JSON.parse(raw);
      if (!parsed?.open) { attemptedEditorRestoreRef.current = true; return; }
    const idx = Math.min(parsed.index ?? 0, (dataUrls.length ? dataUrls.length - 1 : 0));
    if (!dataUrls[idx]) { attemptedEditorRestoreRef.current = true; return; }
      setEditingIndex(idx);
      if (typeof parsed.alt === 'string') setEditingAlt(parsed.alt);
      requestAnimationFrame(() => setEditing(true));
    } catch {
    } finally {
      attemptedEditorRestoreRef.current = true;
    }
  }, [pathname, dataUrls.length, editing, dataUrls, setEditingIndex, setEditingAlt, setEditing, attemptedEditorRestoreRef]);

  // keep index within bounds when number of images changes
  useEffect(() => {
    if (index >= dataUrls.length) setIndex(Math.max(0, dataUrls.length - 1));
  }, [dataUrls.length, index, setIndex]);

  // when entering edit mode, populate editingAlt for the current index
  useEffect(() => {
    if (editing) {
      const cur = Array.isArray(alt) ? alt[editingIndex] || "" : (alt || "");
      setEditingAlt(cur as string);
    }
  }, [editing, editingIndex, alt, setEditingAlt]);

  // add a class to body to allow CSS animations scoped to uploader when ready
  useEffect(() => {
    const cls = 'uploader-pulse-ready';
    if (canPost === true) {
      document.body.classList.add(cls);
    } else {
      document.body.classList.remove(cls);
    }
    return () => { document.body.classList.remove(cls); };
  }, [canPost]);

  // Ensure justDiscarded is reset when photos are present
  useEffect(() => {
    if (dataUrls.length > 0) {
      setJustDiscarded(false);
    }
  }, [dataUrls.length, setJustDiscarded]);

  // body class for preview
  useEffect(() => {
    const emptyCls = 'upload-empty';
    const previewCls = 'uploader-has-preview';
    if (!hasPreview) {
      document.body.classList.add(emptyCls);
      document.body.classList.remove(previewCls);
    } else {
      document.body.classList.remove(emptyCls);
      document.body.classList.add(previewCls);
    }
    return () => { document.body.classList.remove(emptyCls); document.body.classList.remove(previewCls); };
  }, [hasPreview]);
}