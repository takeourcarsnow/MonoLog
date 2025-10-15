"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/src/lib/api";
import { compressImage, approxDataUrlBytes } from "@/src/lib/image";
import { CONFIG } from "@/src/lib/config";
import { useAuth } from "./useAuth";
import { useDraftPersistence } from "./useDraftPersistence";
import { useCountdown } from "./useCountdown";
// typing animation intentionally handled locally in CaptionInput to avoid
// high-frequency state updates re-rendering the uploader tree and stealing
// focus from unrelated inputs.
import { useFileHandling } from "./useFileHandling";
import { useToast } from "../Toast";
import { EDITING_SESSION_KEY, DRAFT_KEY } from "./constants";
import { EditorSettings } from "../imageEditor/types";
import exifr from 'exifr';

export function useUploader() {
  const CAPTION_MAX = 1000;
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [dataUrls, setDataUrls] = useState<string[]>([]);
  const [originalDataUrls, setOriginalDataUrls] = useState<string[]>([]);
  const [editorSettings, setEditorSettings] = useState<EditorSettings[]>([]);
  const [alt, setAlt] = useState<string | string[]>("");
  const [caption, setCaption] = useState("");
  const [spotifyLink, setSpotifyLink] = useState("");
  const [camera, setCamera] = useState("");
  const [lens, setLens] = useState("");
  const [filmType, setFilmType] = useState("");
  const [filmIso, setFilmIso] = useState("");
  const [captionFocused, setCaptionFocused] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number>(0);
  const [editingAlt, setEditingAlt] = useState<string>("");
  const pathname = usePathname();
  const [index, setIndex] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);

  const { canPost, nextAllowedAt, remaining, remainingMs, countdownTotalMs } = useCountdown();
  // typing animation removed from this hook (kept local to CaptionInput)
  const { handleFile: handleFileProcessing } = useFileHandling();

  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileActionRef = useRef<'append' | 'replace'>('append');
  const replaceIndexRef = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const router = useRouter();
  const toast = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const confirmCancelTimerRef = useRef<number | null>(null);
  const [justDiscarded, setJustDiscarded] = useState(false);

  // Provide a stable wrapper for setAlt so draft persistence doesn't get a
  // new function on every render (which would retrigger its effects).
  const setAltForDraft = useCallback((v: string | string[] | undefined) => {
    setAlt(v ?? "");
  }, [setAlt]);

  // Use draft persistence hook (modern draft uses dataUrls array only)
  useDraftPersistence(
    dataUrls, setDataUrls,
    originalDataUrls, setOriginalDataUrls,
    editorSettings, setEditorSettings,
    caption, setCaption,
    alt, setAltForDraft,
    visibility, setVisibility,
    compressedSize, setCompressedSize,
    originalSize, setOriginalSize,
    index, setIndex,
    spotifyLink, setSpotifyLink,
    camera, setCamera,
    lens, setLens,
    filmType, setFilmType,
    filmIso, setFilmIso
  );

  // Ensure we don't show a stale "processing" loader when navigating back
  useEffect(() => {
    if (pathname === '/upload') {
      setProcessing(false);
    }
  }, [pathname]);

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
  }, []);

  // Close editor automatically if user navigates away from /upload
  useEffect(() => {
    if (editing && pathname !== '/upload') {
      try {
        sessionStorage.setItem(EDITING_SESSION_KEY, JSON.stringify({ open: true, index: editingIndex, alt: editingAlt }));
      } catch {}
      setEditing(false);
    }
  }, [pathname, editing, editingAlt, editingIndex]);

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
  const attemptedEditorRestoreRef = useRef(false);
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
  }, [pathname, dataUrls.length, editing, dataUrls]);

  // keep index within bounds when number of images changes
  useEffect(() => {
    if (index >= dataUrls.length) setIndex(Math.max(0, dataUrls.length - 1));
  }, [dataUrls.length, index]);

  // when entering edit mode, populate editingAlt for the current index
  useEffect(() => {
    if (editing) {
      const cur = Array.isArray(alt) ? alt[editingIndex] || "" : (alt || "");
      setEditingAlt(cur as string);
    }
  }, [editing, editingIndex, alt, editingAlt]);

  // add a class to body to allow CSS animations scoped to uploader when ready
  useEffect(() => {
    const cls = 'uploader-pulse-ready';
    if (canPost) {
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
  }, [dataUrls.length]);

  const setDrag = (on: boolean) => {
    dropRef.current?.classList.toggle("dragover", on);
  };

  function resetDraft() {
    // Add blur effect before clearing data
    setJustDiscarded(true);
    
    // Clear data after blur starts
    setTimeout(() => {
      try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
      sessionStorage.removeItem(EDITING_SESSION_KEY);
      setDataUrls([]);
      setOriginalDataUrls([]);
      setEditorSettings([]);
      setCaption("");
      setSpotifyLink("");
      setCamera("");
      setLens("");
      setFilmType("");
      setFilmIso("");
      setAlt("");
      setVisibility("public");
      setCompressedSize(null);
      setOriginalSize(null);
      setIndex(0);
      setPreviewLoaded(false);
      setEditing(false);
      // Clear file inputs to allow re-selection
      try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (e) {}
      try { if (cameraInputRef.current) (cameraInputRef.current as HTMLInputElement).value = ""; } catch (e) {}
      
      // Remove blur after data is cleared
      setTimeout(() => setJustDiscarded(false), 200);
    }, 100);
  }  function removePhoto(atIndex: number) {
    if (dataUrls.length === 0) return;
    const safeIndex = Math.min(atIndex, dataUrls.length - 1);
    const newDataUrls = dataUrls.filter((_, i) => i !== safeIndex);
    const newOriginalDataUrls = originalDataUrls.filter((_, i) => i !== safeIndex);
    const newEditorSettings = editorSettings.filter((_, i) => i !== safeIndex);
    setDataUrls(newDataUrls);
    setOriginalDataUrls(newOriginalDataUrls);
    setEditorSettings(newEditorSettings);
    // Reset blur state when photos are present to prevent stuck blur
    if (newDataUrls.length > 0) {
      setJustDiscarded(false);
    }
    if (Array.isArray(alt)) {
      setAlt(alt.filter((_, i) => i !== safeIndex));
    }
    if (newDataUrls.length === 0) {
      // Clear all inputs when no photos remain
      setCaption("");
      setSpotifyLink("");
      setCamera("");
      setLens("");
      setFilmType("");
      setFilmIso("");
      setAlt("");
      setIndex(0);
    } else {
      if (safeIndex === 0) {
        // first image changed, ensure preview shows the first element
      }
      if (index >= newDataUrls.length) {
        setIndex(Math.max(0, newDataUrls.length - 1));
      }
    }
    setPreviewLoaded(false);
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.show("Please select an image file");
      return;
    }
    setProcessing(true);
    setPreviewLoaded(false);
    setOriginalSize(file.size);
    setCompressedSize(null);
    try {
      const url = await compressImage(file);
      const bytes = approxDataUrlBytes(url);
      setCompressedSize(bytes);
      setDataUrls(d => {
        const next = [...d, url].slice(0, 5);
        return next;
      });
      setOriginalDataUrls(d => {
        const next = [...d, url].slice(0, 5);
        return next;
      });
      setEditorSettings(s => {
        const next = [...s, {}].slice(0, 5);
        return next;
      });
      setIndex(dataUrls.length); // Auto-select the newly added photo
      setEditing(false);
      try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (e) {}
      if (!alt && caption) setAlt(caption);

      // Extract EXIF data
      try {
        const exif = await exifr.parse(file, { pick: ['Make', 'Model', 'LensModel', 'LensMake'] });
        if (exif) {
          const cameraMake = exif.Make || '';
          const cameraModel = exif.Model || '';
          const camera = cameraMake && cameraModel ? `${cameraMake} ${cameraModel}` : cameraMake || cameraModel || '';
          const lensMake = exif.LensMake || '';
          const lensModel = exif.LensModel || '';
          const lens = lensMake && lensModel ? `${lensMake} ${lensModel}` : lensMake || lensModel || '';
          if (camera) setCamera(camera);
          if (lens) setLens(lens);
        }
      } catch (e) {
        // Ignore EXIF extraction errors
      }
    } catch (e) {
      console.error(e);
      toast.show("Failed to process image");
      try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (e) {}
    } finally {
      setProcessing(false);
    }
  }

  async function publish(replace: boolean) {
    const images = dataUrls.length ? dataUrls : [];
    if (!images.length) return toast.show("Please select at least one image");
    const maxBytes = CONFIG.imageMaxSizeMB * 1024 * 1024;
    if (compressedSize && compressedSize > maxBytes) {
      return toast.show(`Compressed image is too large (${Math.round(compressedSize/1024)} KB). Try a smaller photo or reduce quality.`);
    }
    setProcessing(true);
    try {
      await api.createOrReplaceToday({
        imageUrls: images.slice(0, 5),
        caption,
        spotifyLink: spotifyLink || undefined,
        alt: alt || caption || "Photo from today's entry",
        replace,
        public: visibility === "public",
        camera: camera || undefined,
        lens: lens || undefined,
        filmType: (filmType && filmIso) ? `${filmType} ${filmIso}` : (filmType || filmIso) || undefined,
      });
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('monolog:post_created', { detail: { replaced: replace } }));
        }
      } catch (_) { /* ignore */ }
      resetDraft();
      router.push("/");
    } catch (e: any) {
      if (e?.code === "LIMIT") {
        toast.show("You already posted today. Tap 'Replace today's post' to replace it.");
      } else {
        toast.show(e?.message || "Failed to publish");
      }
      setProcessing(false);
    }
  }

  async function handleFileInputChange() {
    const files = Array.from(fileInputRef.current?.files || []).slice(0, 5);
    if (fileActionRef.current === 'replace') {
      if (files.length > 1) {
        setProcessing(true);
        setPreviewLoaded(false);
        try {
          const newUrls: string[] = [];
          for (const f of files) {
            try {
              const url = await compressImage(f);
              newUrls.push(url);
            } catch (e) {
              console.error('Failed to process one of replacement files', e);
            }
          }
          if (newUrls.length) {
            const next = newUrls.slice(0, 5);
            setDataUrls(next);
            setOriginalDataUrls(next.slice());
            setEditorSettings(next.map(() => ({})));
            try { setCompressedSize(approxDataUrlBytes(next[0])); } catch (_) {}
            try { setOriginalSize(files[0].size); } catch (_) {}
          }
        } finally {
          setProcessing(false);
        }
      } else {
        const f = files[0];
        if (f) {
          setProcessing(true);
          try {
            const url = await compressImage(f);
            const bytes = approxDataUrlBytes(url);
            setCompressedSize(bytes);
            const replaceAt = replaceIndexRef.current ?? (dataUrls.length ? index : 0);
              if (dataUrls.length) {
              const safeReplaceAt = Math.min(replaceAt, dataUrls.length - 1);
              setDataUrls(d => {
                const copy = [...d];
                copy[safeReplaceAt] = url;
                return copy;
              });
              setOriginalDataUrls(d => {
                const copy = [...d];
                copy[safeReplaceAt] = url;
                return copy;
              });
              setEditorSettings(s => {
                const copy = [...s];
                copy[safeReplaceAt] = {};
                return copy;
              });
              if (safeReplaceAt === 0) { setPreviewLoaded(false); }
            } else {
              setDataUrls([url]);
              setOriginalDataUrls([url]);
              setEditorSettings([{}]);
              setPreviewLoaded(false);
            }
            setOriginalSize(approxDataUrlBytes(f as any));
          } catch (e) {
            console.error(e);
            toast.show('Failed to process replacement image');
          } finally {
            setProcessing(false);
          }
        }
      }
      fileActionRef.current = 'append';
      replaceIndexRef.current = null;
    } else {
      if (!files.length) return;
      setProcessing(true);
      setPreviewLoaded(false);
      try {
        const newUrls: string[] = [];
        for (const f of files) {
          try {
            const url = await compressImage(f);
            newUrls.push(url);
          } catch (e) {
            console.error('Failed to process one of selected files', e);
          }
        }
        if (!newUrls.length) return;
        setDataUrls(d => {
          const next = [...d, ...newUrls].slice(0, 5);
          return next;
        });
        setOriginalDataUrls(d => {
          const next = [...d, ...newUrls].slice(0, 5);
          return next;
        });
        setEditorSettings(s => {
          const next = [...s, ...newUrls.map(() => ({}))].slice(0, 5);
          return next;
        });
        setIndex(Math.min(dataUrls.length + newUrls.length - 1, 4)); // Auto-select the last added photo
        setPreviewLoaded(false);
        try { setCompressedSize(approxDataUrlBytes(newUrls[0])); } catch (_) {}
        try { setOriginalSize(files[0].size); } catch (_) {}
      } finally {
        setProcessing(false);
      }
    }
  }

  const hasPreview = Boolean(dataUrls.length);

  useEffect(() => {
    if (typeof document === 'undefined') return;
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

  const captionRemaining = Math.max(0, CAPTION_MAX - (caption?.length || 0));

  return {
  // State
  originalSize,
    dataUrls,
    originalDataUrls,
    editorSettings,
    alt,
    caption,
  spotifyLink,
  camera,
  lens,
  filmType,
  filmIso,
    captionFocused,
    visibility,
    previewLoaded,
    editing,
    editingIndex,
    editingAlt,
    index,
    processing,
    compressedSize,
    canPost,
    nextAllowedAt,
    remaining,
    remainingMs,
    countdownTotalMs,
  // placeholder, typed removed - handled inside CaptionInput
    handleFileProcessing,
    dropRef,
    fileInputRef,
    cameraInputRef,
    fileActionRef,
    replaceIndexRef,
    trackRef,
    touchStartX,
    touchDeltaX,
    toast,
    confirmCancel,
    setConfirmCancel,
    confirmCancelTimerRef,
    justDiscarded,
    hasPreview,
    captionRemaining,
    CAPTION_MAX,

  // Setters
  setOriginalSize,
    setDataUrls,
    setOriginalDataUrls,
    setEditorSettings,
    setAlt,
    setCaption,
  setSpotifyLink,
  setCamera,
  setLens,
  setFilmType,
  setFilmIso,
    setCaptionFocused,
    setVisibility,
    setPreviewLoaded,
    setEditing,
    setEditingIndex,
    setEditingAlt,
    setIndex,
    setProcessing,
    setCompressedSize,

    // Functions
    setDrag,
    resetDraft,
    removePhoto,
    handleFile,
    publish,
    handleFileInputChange,
  };
}
