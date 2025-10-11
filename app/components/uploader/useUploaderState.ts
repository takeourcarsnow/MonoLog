import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/src/lib/api";
import { compressImage, approxDataUrlBytes } from "@/src/lib/image";
import { CONFIG } from "@/src/lib/config";
import { useAuth } from "./useAuth";
import { useDraftPersistence } from "./useDraftPersistence";
import { useCountdown } from "./useCountdown";
// typing animation handled locally in CaptionInput to avoid stealing focus
import { useCameraCapture } from "./useCameraCapture";
import { useFileHandling } from "./useFileHandling";
import { useToast } from "../Toast";
import { PHRASES, EDITING_SESSION_KEY, DRAFT_KEY } from "./constants";
import { EditorSettings } from "../imageEditor/types";

export function useUploaderState() {
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
  const { cameraOpen, setCameraOpen, videoRef, streamRef, openCamera, closeCamera } = useCameraCapture();
  const { handleFile: handleFileProcessing } = useFileHandling();
  const toast = useToast();
  const router = useRouter();

  // Refs
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileActionRef = useRef<'append' | 'replace'>('append');
  const replaceIndexRef = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const confirmCancelTimerRef = useRef<number | null>(null);

  // Inline cancel confirmation (double tap to discard draft)
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Use draft persistence hook
  const setAltForDraft = useCallback((v: string | string[] | undefined) => { setAlt(v ?? ""); }, [setAlt]);

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
    filmType, setFilmType
  );

  // Ensure we don't show a stale "processing" loader when navigating back
  useEffect(() => {
    if (pathname === '/upload') {
      setProcessing(false);
    }
  }, [pathname]);

  // Clear processing when a post is created elsewhere in the app.
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
      } else {
        if (pathname === '/upload') sessionStorage.removeItem(EDITING_SESSION_KEY);
      }
    } catch {}
  }, [editing, editingIndex, editingAlt, pathname]);

  // One-time restoration of editor state after returning to /upload.
  const attemptedEditorRestoreRef = useRef(false);
  useEffect(() => {
    if (attemptedEditorRestoreRef.current) return;
    if (pathname !== '/upload') return;
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

  // apply transform when index changes
  useEffect(() => {
    if (trackRef.current) {
      try {
        const wrapper = trackRef.current.parentElement as HTMLElement | null;
        const w = wrapper ? wrapper.clientWidth : trackRef.current.clientWidth;
        trackRef.current.style.transform = `translateX(-${index * w}px)`;
      } catch (e) {
        trackRef.current.style.transform = `translateX(-${index * 100}%)`;
      }
    }
  }, [index]);

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

  function resetDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    setDataUrls([]);
    setOriginalDataUrls([]);
    setEditorSettings([]);
    setCaption("");
    setSpotifyLink("");
    setCamera("");
    setLens("");
    setFilmType("");
    setAlt("");
    setVisibility("public");
    setCompressedSize(null);
    setOriginalSize(null);
    setIndex(0);
    setPreviewLoaded(false);
    setEditing(false);
  }

  // Size stats tracked internally but not logged in production
  useEffect(() => {
    if (originalSize != null) {
    }
  }, [originalSize]);

  useEffect(() => {
    if (compressedSize != null) {
    }
  }, [compressedSize]);

  const setDrag = (on: boolean) => {
    dropRef.current?.classList.toggle("dragover", on);
  };

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
  // modern flow uses dataUrls array only
      setEditing(false);
  try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (e) {}
  if (!alt && caption) setAlt(caption);
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
        camera: camera || undefined,
        lens: lens || undefined,
        filmType: filmType || undefined,
        alt: alt || caption || "Photo from today's entry",
        replace,
        public: visibility === "public",
      });
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('monolog:post_created', { detail: { replaced: replace } }));
        }
      } catch (_) { /* ignore */ }
      resetDraft();
      try {
        const cur = await api.getCurrentUser();
        if (cur?.username) router.push(`/${cur.username}`);
        else if (cur?.id) router.push(`/${cur.id}`);
        else router.push("/profile");
      } catch (e) {
        router.push("/profile");
      }
    } catch (e: any) {
      if (e?.code === "LIMIT") {
        toast.show("You already posted today. Tap 'Replace today's post' to replace it.");
      } else {
        toast.show(e?.message || "Failed to publish");
      }
      setProcessing(false);
    }
  }

  return {
    CAPTION_MAX,
    originalSize, setOriginalSize,
    dataUrls, setDataUrls,
    originalDataUrls, setOriginalDataUrls,
    editorSettings, setEditorSettings,
    alt, setAlt,
    caption, setCaption,
    camera, setCamera,
    lens, setLens,
    filmType, setFilmType,
    captionFocused, setCaptionFocused,
    visibility, setVisibility,
    previewLoaded, setPreviewLoaded,
    editing, setEditing,
    editingIndex, setEditingIndex,
    editingAlt, setEditingAlt,
    index, setIndex,
    processing, setProcessing,
    compressedSize, setCompressedSize,
    canPost, nextAllowedAt, remaining, remainingMs, countdownTotalMs,
  // placeholder, typed removed - handled inside CaptionInput
    cameraOpen, setCameraOpen, videoRef, streamRef, openCamera, closeCamera,
    handleFileProcessing,
    toast,
    router,
    dropRef, fileInputRef, cameraInputRef, fileActionRef, replaceIndexRef, trackRef, touchStartX, touchDeltaX, confirmCancelTimerRef,
    confirmCancel, setConfirmCancel,
    resetDraft,
    setDrag,
    handleFile,
    publish,
  };
}
