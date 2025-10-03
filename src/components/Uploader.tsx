/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { AuthForm } from "./AuthForm";
import { compressImage, approxDataUrlBytes } from "@/lib/image";
import { CONFIG } from "@/lib/config";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "./Toast";
import { PHRASES, EDITING_SESSION_KEY, DRAFT_KEY } from "./uploader/constants";
import { DropZone } from "./uploader/DropZone";
import { FileInputs } from "./uploader/FileInputs";
import { PreviewSection } from "./uploader/PreviewSection";
import { CaptionInput } from "./uploader/CaptionInput";
import { PublishControls } from "./uploader/PublishControls";
import ImageEditor from "./ImageEditor";
import { EditorSettings } from "./imageEditor/types";
import Portal from "./Portal";
import { PublishButton } from "./PublishButton";

export function Uploader() {
  // Light wrapper handling auth gating so inner uploader hooks remain stable
  const [me, setMe] = useState<any | null | undefined>(undefined);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await api.getCurrentUser();
        if (mounted) setMe(u);
      } catch { if (mounted) setMe(null); }
    })();
    const onAuth = async () => {
      try {
        const u = await api.getCurrentUser();
        if (mounted) setMe(u);
      } catch { if (mounted) setMe(null); }
    };
    if (typeof window !== 'undefined') window.addEventListener('auth:changed', onAuth);
    return () => { mounted = false; if (typeof window !== 'undefined') window.removeEventListener('auth:changed', onAuth); };
  }, []);

  if (me === undefined) {
    return (
      <div className="view-fade">
        <div className="card skeleton" style={{ height: 200, maxWidth: 600, margin: '24px auto' }} />
      </div>
    );
  }
  if (!me) {
    return (
      <div className="view-fade auth-host" style={{ maxWidth: 520, margin: '28px auto 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <AuthForm onClose={async () => setMe(await api.getCurrentUser())} />
      </div>
    );
  }
  return <UploaderCore />;
}

function UploaderCore() {
  const CAPTION_MAX = 1000;
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [dataUrls, setDataUrls] = useState<string[]>([]);
  // Store original unedited images so we can always start fresh in the editor
  const [originalDataUrls, setOriginalDataUrls] = useState<string[]>([]);
  // Store editor settings for each image so we can restore them when reopening the editor
  const [editorSettings, setEditorSettings] = useState<EditorSettings[]>([]);
  const [alt, setAlt] = useState<string | string[]>("");
  const [caption, setCaption] = useState("");
  const [captionFocused, setCaptionFocused] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [processing, setProcessing] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [canPost, setCanPost] = useState<boolean | null>(null);
  const [nextAllowedAt, setNextAllowedAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<string>("");
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [countdownTotalMs, setCountdownTotalMs] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number>(0);
  const [editingAlt, setEditingAlt] = useState<string>("");
  const pathname = usePathname();

  // Ensure we don't show a stale "processing" loader when navigating back
  // to the upload page via client-side routing. Some client navigation
  // patterns can preserve component state (including `processing`) so
  // explicitly clear it when the user arrives at `/upload`.
  useEffect(() => {
    if (pathname === '/upload') {
      setProcessing(false);
    }
  }, [pathname]);

  // Clear processing when a post is created elsewhere in the app. The
  // publish flow dispatches a `monolog:post_created` event; listen for it
  // and ensure we remove any stale processing indicator.
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

  // When the image editor is open, prevent background scrolling so the overlay
  // Previously the editor opened in a fullscreen modal and blocked body
  // scrolling. The editor now opens inline inside the uploader preview so
  // we no longer toggle body overflow here.

  // Close editor automatically if user navigates away from /upload
  useEffect(() => {
    if (editing && pathname !== '/upload') {
      // Persist open state so coming back can restore it
      try {
        sessionStorage.setItem(EDITING_SESSION_KEY, JSON.stringify({ open: true, index: editingIndex, alt: editingAlt }));
      } catch {}
      setEditing(false); // unmount editor while off the page
    }
  }, [pathname, editing]);

  // Persist or clear the session flag whenever editing state changes
  useEffect(() => {
    try {
      if (editing) {
        sessionStorage.setItem(EDITING_SESSION_KEY, JSON.stringify({ open: true, index: editingIndex, alt: editingAlt }));
      } else {
        // Only clear if we're still on /upload; if we left the page the route-change effect already stored it
        if (pathname === '/upload') sessionStorage.removeItem(EDITING_SESSION_KEY);
      }
    } catch {}
  }, [editing, editingIndex, editingAlt, pathname]);

  // One-time restoration of editor state after returning to /upload.
  // Waits for images (dataUrls or dataUrl) to exist so we can safely reopen.
  const attemptedEditorRestoreRef = useRef(false);
  useEffect(() => {
    if (attemptedEditorRestoreRef.current) return; // already attempted
    if (pathname !== '/upload') return; // only restore on upload page
    if (editing) { attemptedEditorRestoreRef.current = true; return; } // already open
    // Ensure we have at least one image loaded (arrays restored asynchronously)
    if (!(dataUrls.length > 0 || dataUrl)) return; // wait for next render when images appear
    try {
      const raw = sessionStorage.getItem(EDITING_SESSION_KEY);
      if (!raw) { attemptedEditorRestoreRef.current = true; return; }
      const parsed = JSON.parse(raw);
      if (!parsed?.open) { attemptedEditorRestoreRef.current = true; return; }
      const idx = Math.min(parsed.index ?? 0, (dataUrls.length ? dataUrls.length - 1 : 0));
      if (!(dataUrls[idx] || dataUrl)) { attemptedEditorRestoreRef.current = true; return; }
      setEditingIndex(idx);
      if (typeof parsed.alt === 'string') setEditingAlt(parsed.alt);
      requestAnimationFrame(() => setEditing(true));
    } catch {
      // swallow errors silently
    } finally {
      attemptedEditorRestoreRef.current = true;
    }
  }, [pathname, dataUrls.length, dataUrl, editing]);
  // rotating caption placeholder (persisted across reloads so users see a different prompt each time)
  // Initialize from localStorage so the rotated prompt appears immediately on first render.
  const [placeholder, setPlaceholder] = useState<string>(() => {
    const key = "monolog:captionPlaceholderIndex";
    try {
      const raw = localStorage.getItem(key);
      let idx = Number.isFinite(Number(raw)) ? Number(raw) : -1;
      idx = (idx + 1) % PHRASES.length;
      localStorage.setItem(key, String(idx));
      return PHRASES[idx];
    } catch (e) {
      return PHRASES[0];
    }
  });
  // typed text for the JS-driven typing/backspace animation
  const [typed, setTyped] = useState<string>("");
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileActionRef = useRef<'append' | 'replace'>('append');
  const replaceIndexRef = useRef<number | null>(null);
   const [index, setIndex] = useState<number>(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const router = useRouter();

  // keep index within bounds when number of images changes
  useEffect(() => {
    if (index >= dataUrls.length) setIndex(Math.max(0, dataUrls.length - 1));
  }, [dataUrls.length, index]);

  // apply transform when index changes
  useEffect(() => {
    if (trackRef.current) trackRef.current.style.transform = `translateX(-${index * 100}%)`;
  }, [index]);

  // when entering edit mode, populate editingAlt for the current index
  useEffect(() => {
    if (editing) {
      const cur = Array.isArray(alt) ? alt[editingIndex] || "" : (alt || "");
      setEditingAlt(cur as string);
    }
  }, [editing, editingIndex, alt]);

  useEffect(() => {
    (async () => {
      const can = await api.canPostToday();
      setCanPost(can.allowed);
      // Prefer server-provided nextAllowedAt/lastPostedAt which encode the calendar-day window.
      if (!can.allowed) {
        const next = can.nextAllowedAt ?? null;
        const last = (can as any).lastPostedAt ?? null;
        if (next && last) {
          setNextAllowedAt(next);
          // total window is from lastPostedAt -> nextAllowedAt (usually less than 24h depending on post time)
          setCountdownTotalMs(Math.max(0, next - last));
          try { localStorage.setItem('monolog:nextAllowedAt', String(next)); localStorage.setItem('monolog:lastPostedAt', String(last)); } catch (e) {}
        } else if (next) {
          // fallback: we only have nextAllowedAt (server chose to provide it). Assume full 24h for progress visuals.
          const COOLDOWN_TOTAL_MS = 24 * 60 * 60 * 1000;
          setNextAllowedAt(next);
          setCountdownTotalMs(COOLDOWN_TOTAL_MS);
          try { localStorage.setItem('monolog:nextAllowedAt', String(next)); localStorage.removeItem('monolog:lastPostedAt'); } catch (e) {}
        } else {
          // No timing info provided; fall back to a full-24h window starting now
          const COOLDOWN_TOTAL_MS = 24 * 60 * 60 * 1000;
          const assumedNext = Date.now() + COOLDOWN_TOTAL_MS;
          setNextAllowedAt(assumedNext);
          setCountdownTotalMs(COOLDOWN_TOTAL_MS);
          try { localStorage.setItem('monolog:nextAllowedAt', String(assumedNext)); localStorage.removeItem('monolog:lastPostedAt'); } catch (e) {}
        }
      } else {
        // clear any stored value if allowed
        try { localStorage.removeItem('monolog:nextAllowedAt'); localStorage.removeItem('monolog:lastPostedAt'); } catch (e) {}
        setCountdownTotalMs(null);
        setNextAllowedAt(null);
      }
    })();
  }, []);

  // update remaining countdown every second when nextAllowedAt is known
  useEffect(() => {
    // Try to read persisted values if missing
    let initial = nextAllowedAt;
    let lastPosted = null as number | null;
    if (!initial) {
      try { const stored = localStorage.getItem('monolog:nextAllowedAt'); if (stored) initial = Number(stored); } catch (e) {}
    }
    try { const storedLast = localStorage.getItem('monolog:lastPostedAt'); if (storedLast) lastPosted = Number(storedLast); } catch (e) {}
    if (!initial) return;

    function fmt(ms: number) {
      // Display hours, minutes, and seconds for full countdown visibility
      if (ms <= 0) return "0:00:00";
      const totalSeconds = Math.floor(ms / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${h}:${pad(m)}:${pad(s)}`;
    }
    
    // Compute remaining and total window. If we have lastPosted, use that to compute a precise total window
    const now = Date.now();
    const ms0 = initial - now;
    const initialTime = fmt(ms0);
    setRemaining(initialTime);
    setRemainingMs(ms0);
    if (lastPosted && !countdownTotalMs) {
      setCountdownTotalMs(Math.max(0, initial - lastPosted));
    }

    const id = setInterval(() => {
      const ms = initial! - Date.now();
      if (ms <= 0) {
        setCanPost(true);
        setNextAllowedAt(null);
        setRemaining("");
        setRemainingMs(null);
        try { localStorage.removeItem('monolog:nextAllowedAt'); localStorage.removeItem('monolog:lastPostedAt'); } catch (e) {}
        clearInterval(id);
        return;
      }
      const newTime = fmt(ms);
      setRemaining(newTime);
      setRemainingMs(ms);
    }, 1000); // update every second
    
    return () => clearInterval(id);
  }, [nextAllowedAt, countdownTotalMs]);


  const toast = useToast();
  // Inline cancel confirmation (double tap to discard draft)
  const [confirmCancel, setConfirmCancel] = useState(false);
  const confirmCancelTimerRef = useRef<number | null>(null);
  // camera capture state
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  // no percent shown anymore; we only show a short hint when ready

  // Draft persistence key
  const DRAFT_KEY = "monolog:draft";

  // restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (parsed.dataUrls) setDataUrls(parsed.dataUrls);
          if (parsed.originalDataUrls) setOriginalDataUrls(parsed.originalDataUrls);
          if (parsed.editorSettings) setEditorSettings(parsed.editorSettings);
          if (parsed.dataUrl) setDataUrl(parsed.dataUrl);
          if (parsed.caption) setCaption(parsed.caption);
          if (parsed.alt !== undefined) setAlt(parsed.alt);
          // Restore visibility only if the persisted draft actually contains images.
          // This ensures a fresh composer defaults to public even if a previous draft
          // had changed visibility without images.
          if (parsed.visibility && (parsed.dataUrls || parsed.dataUrl)) setVisibility(parsed.visibility);
          if (parsed.compressedSize !== undefined) setCompressedSize(parsed.compressedSize);
          if (parsed.originalSize !== undefined) setOriginalSize(parsed.originalSize);
          if (parsed.index !== undefined) setIndex(parsed.index);
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  // Persist draft whenever key pieces of state change
  useEffect(() => {
    try {
      const payload = {
        dataUrls: dataUrls.length ? dataUrls : undefined,
        originalDataUrls: originalDataUrls.length ? originalDataUrls : undefined,
        editorSettings: editorSettings.length ? editorSettings : undefined,
        dataUrl: dataUrl || undefined,
        caption: caption || undefined,
        alt: alt === undefined ? undefined : alt,
        visibility,
        compressedSize: compressedSize ?? undefined,
        originalSize: originalSize ?? undefined,
        index,
        // timestamp could be useful for future TTL
        savedAt: Date.now(),
      } as any;
      // Defensive merge: if we're about to persist a payload with no images,
      // but there's an existing saved draft that does contain images, keep
      // those images to avoid accidentally losing them (for example when
      // opening the file picker and cancelling).
      try {
        const existingRaw = localStorage.getItem(DRAFT_KEY);
        if (existingRaw) {
          const existing = JSON.parse(existingRaw);
          if ((!payload.dataUrls && !payload.dataUrl) && (existing?.dataUrls || existing?.dataUrl)) {
            if (existing.dataUrls) payload.dataUrls = existing.dataUrls;
            else if (existing.dataUrl) payload.dataUrl = existing.dataUrl;
            if (existing.originalDataUrls) payload.originalDataUrls = existing.originalDataUrls;
            if (existing.editorSettings) payload.editorSettings = existing.editorSettings;
          }
        }
      } catch (e) {
        // ignore parse errors and fall back to writing payload as-is
      }
      // only keep keys that are set to reduce size
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch (e) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [dataUrls, originalDataUrls, editorSettings, dataUrl, caption, alt, visibility, compressedSize, originalSize, index]);

  function resetDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    setDataUrls([]);
    setOriginalDataUrls([]);
    setEditorSettings([]);
    setDataUrl(null);
    setCaption("");
    setAlt("");
    setVisibility("public");
    setCompressedSize(null);
    setOriginalSize(null);
    setIndex(0);
    setPreviewLoaded(false);
    setEditing(false);
  }

  // placeholder is initialized synchronously above; no mount-effect needed

  // Typing/backspace loop: types a phrase, pauses, deletes it, then moves to the next phrase.
  // It runs until the user starts typing into the caption input (caption !== "").
  useEffect(() => {
    let mounted = true;
    const key = "monolog:captionPlaceholderIndex";

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const typeSpeed = 40;
    const deleteSpeed = 28;
    const pauseAfterType = 900;
    const pauseBetween = 420;

    // stop immediately if user started typing
    if (caption && caption.length > 0) {
      setTyped("");
      return;
    }

    (async () => {
      let idx = 0;
      try {
        const raw = localStorage.getItem(key);
        idx = Number.isFinite(Number(raw)) ? Number(raw) : 0;
      } catch (e) {}

      while (mounted && (!caption || caption.length === 0)) {
        const msg = PHRASES[idx % PHRASES.length] || PHRASES[0];

        // type forward
        for (let i = 1; i <= msg.length; i++) {
          if (!mounted || (caption && caption.length > 0)) return;
          setTyped(msg.slice(0, i));
          await sleep(typeSpeed + (i % 3 === 0 ? 8 : 0));
        }

        if (!mounted || (caption && caption.length > 0)) break;
        await sleep(pauseAfterType);

        // delete
        for (let i = msg.length; i >= 0; i--) {
          if (!mounted || (caption && caption.length > 0)) return;
          setTyped(msg.slice(0, i));
          await sleep(deleteSpeed + (i % 2 === 0 ? 4 : 0));
        }

        // advance and persist
        idx = (idx + 1) % PHRASES.length;
        try { localStorage.setItem(key, String(idx)); } catch (e) {}
        await sleep(pauseBetween);
      }

      if (mounted) setTyped("");
    })();

    return () => { mounted = false; };
  }, [caption]);

  // Size stats tracked internally but not logged in production
  useEffect(() => {
    if (originalSize != null) {
      // Size tracking available for debugging if needed
    }
  }, [originalSize]);

  useEffect(() => {
    if (compressedSize != null) {
      // Size tracking available for debugging if needed
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
    setPreviewLoaded(false); // Show loader immediately
    setOriginalSize(file.size);
    setCompressedSize(null);
    try {
      const url = await compressImage(file);
      const bytes = approxDataUrlBytes(url);
      setCompressedSize(bytes);
      // append to array (max 5)
      setDataUrls(d => {
        const next = [...d, url].slice(0, 5);
        return next;
      });
      // also store the original unedited version
      setOriginalDataUrls(d => {
        const next = [...d, url].slice(0, 5);
        return next;
      });
      // initialize empty settings for this new image
      setEditorSettings(s => {
        const next = [...s, {}].slice(0, 5);
        return next;
      });
      // set the primary preview to the first image
  if (!dataUrl) { setDataUrl(url); }
      // ensure any previously-open editor is closed when a new file is chosen
      setEditing(false);
      // clear the file input so selecting the same file again will fire change
      try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (e) {}
      if (!alt && caption) setAlt(caption);
    } catch (e) {
      console.error(e);
      toast.show("Failed to process image");
      setDataUrl(null);
      try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (e) {}
    } finally {
      setProcessing(false);
    }
  }

  async function publish(replace: boolean) {
    const images = dataUrls.length ? dataUrls : dataUrl ? [dataUrl] : [];
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
        alt: alt || caption || "Daily photo",
        replace,
        public: visibility === "public",
      });
      // Notify other mounted views (Profile, Feed, etc.) that a post was created or replaced
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('monolog:post_created', { detail: { replaced: replace } }));
        }
      } catch (_) { /* ignore */ }
      // clear persisted draft (navigation will unmount but be safe)
      resetDraft();
      // Prefer routing to the user's username route when available so we land
      // on domain.tld/[username] instead of /profile. Try to refresh user
      // info if we don't already have it.
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
        toast.show("You already posted today. Tap 'Replace today’s post' to replace it.");
      } else {
        toast.show(e?.message || "Failed to publish");
      }
      setProcessing(false);
    }
  }

  // main uploader UI (toolbar removed per request)
  const hasPreview = Boolean(dataUrl || dataUrls.length);
  // Toggle body classes so we can shrink bottom padding when empty and
  // reduce outer content padding when a preview exists (fallback for browsers
  // without :has()). Keeps the upload layout compact and avoids an extra scrollbar.
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

  return (
    <div className={`uploader view-fade ${hasPreview ? 'has-preview' : ''}`}>

      {!dataUrl && !dataUrls.length && (
        <DropZone
          processing={processing}
          onFileSelect={() => fileInputRef.current?.click()}
          onCameraSelect={async () => {
            // prefer getUserMedia modal; fall back to capture file input when unavailable
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              setCameraOpen(true);
              try {
                const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
                streamRef.current = s;
                if (videoRef.current) videoRef.current.srcObject = s;
              } catch (e) {
                console.error(e);
                toast.show('Camera access denied or unavailable');
                setCameraOpen(false);
                try { cameraInputRef.current?.click(); } catch (_) {}
              }
            } else {
              try { cameraInputRef.current?.click(); } catch (_) {}
            }
          }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
          onDrop={async (e) => {
            e.preventDefault(); setDrag(false);
            if (processing) return;
            const file = e.dataTransfer.files?.[0];
            if (file) await handleFile(file);
          }}
          dropRef={dropRef}
        />
      )}

      <FileInputs
        fileInputRef={fileInputRef}
        cameraInputRef={cameraInputRef}
        onFileChange={async () => {
          const files = Array.from(fileInputRef.current?.files || []);
          if (fileActionRef.current === 'replace') {
            // replace only the first selected file at the provided index
            const f = files[0];
            if (f) {
              setProcessing(true);
              try {
                const url = await compressImage(f);
                const bytes = approxDataUrlBytes(url);
                setCompressedSize(bytes);
                const replaceAt = replaceIndexRef.current ?? (dataUrls.length ? index : 0);
                if (dataUrls.length) {
                  setDataUrls(d => {
                    const copy = [...d];
                    copy[replaceAt] = url;
                    return copy;
                  });
                  // also update the original
                  setOriginalDataUrls(d => {
                    const copy = [...d];
                    copy[replaceAt] = url;
                    return copy;
                  });
                  // reset settings for replaced image
                  setEditorSettings(s => {
                    const copy = [...s];
                    copy[replaceAt] = {};
                    return copy;
                  });
                  if (replaceAt === 0) { setDataUrl(url); setPreviewLoaded(false); }
                } else {
                  // no array yet, just set primary preview
                  setDataUrl(url);
                  setPreviewLoaded(false);
                  setDataUrls([url]);
                  setOriginalDataUrls([url]);
                  setEditorSettings([{}]);
                }
                setOriginalSize(approxDataUrlBytes(f as any));
              } catch (e) {
                console.error(e);
                toast.show('Failed to process replacement image');
              } finally {
                setProcessing(false);
              }
            }
            // reset action
            fileActionRef.current = 'append';
            replaceIndexRef.current = null;
          } else {
            for (const f of files.slice(0, 5)) {
              await handleFile(f);
            }
          }
        }}
        onCameraChange={async () => {
          const f = cameraInputRef.current?.files?.[0];
          if (!f) return;
          await handleFile(f);
          try { cameraInputRef.current!.value = ""; } catch (_) {}
        }}
      />

      <PreviewSection
        dataUrl={dataUrl}
        dataUrls={dataUrls}
        originalDataUrls={originalDataUrls}
        editorSettings={editorSettings}
        alt={alt}
        editing={editing}
        editingIndex={editingIndex}
        editingAlt={editingAlt}
        setAlt={setAlt}
        setEditorSettings={setEditorSettings}
        setDataUrls={setDataUrls}
        setOriginalDataUrls={setOriginalDataUrls}
        setDataUrl={setDataUrl}
        setPreviewLoaded={setPreviewLoaded}
        setCompressedSize={setCompressedSize}
        setOriginalSize={setOriginalSize}
        setProcessing={setProcessing}
        setEditing={setEditing}
        setEditingIndex={setEditingIndex}
        processing={processing}
        previewLoaded={previewLoaded}
        index={index}
        setIndex={setIndex}
        trackRef={trackRef}
        touchStartX={touchStartX}
        touchDeltaX={touchDeltaX}
        cameraOpen={cameraOpen}
        setCameraOpen={setCameraOpen}
        videoRef={videoRef}
        streamRef={streamRef}
        fileActionRef={fileActionRef}
        replaceIndexRef={replaceIndexRef}
        fileInputRef={fileInputRef}
        cameraInputRef={cameraInputRef}
        toast={toast}
        handleFile={handleFile}
      />

      <div style={{ marginTop: 8 }}>
        {compressedSize != null && compressedSize > CONFIG.imageMaxSizeMB * 1024 * 1024 ? (
          <div className="warn">Compressed image exceeds the maximum of {CONFIG.imageMaxSizeMB} MB. Please resize or choose a smaller file.</div>
        ) : null}
      </div>

      <CaptionInput
        caption={caption}
        setCaption={setCaption}
        typed={typed}
        captionFocused={captionFocused}
        setCaptionFocused={setCaptionFocused}
        hasPreview={hasPreview}
        processing={processing}
        CAPTION_MAX={CAPTION_MAX}
        toast={toast}
      />

      <PublishControls
        hasPreview={hasPreview}
        editing={editing}
        visibility={visibility}
        setVisibility={setVisibility}
        canPost={canPost}
        remaining={remaining}
        remainingMs={remainingMs}
        countdownTotalMs={countdownTotalMs}
        processing={processing}
        compressedSize={compressedSize}
        CONFIG={CONFIG}
        onPublish={() => publish(false)}
        confirmCancel={confirmCancel}
        setConfirmCancel={setConfirmCancel}
        confirmCancelTimerRef={confirmCancelTimerRef}
        resetDraft={resetDraft}
      />

      <div aria-live="polite" className="sr-only status">
        {/* screen-reader updates for processing/errors */}
      </div>
      {/* Screen reader hint when in confirm state */}
      {confirmCancel ? (
        <div className="sr-only" role="status">Tap Cancel again to discard this draft.</div>
      ) : null}
    </div>
  );
}