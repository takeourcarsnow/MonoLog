/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { compressImage, approxDataUrlBytes } from "@/lib/image";
import { CONFIG } from "@/lib/config";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import ImageEditor, { EditorSettings } from "./ImageEditor";
import Portal from "./Portal";
import ConfirmModal from "./ConfirmModal";

// the canonical list of philosophical prompts used for rotation and animated typing
// 10 short, contemplative prompts (rotate one per refresh)
const PHRASES = [
  "Share today’s images — let the day speak as one quiet sequence.",
  "Gather a small sequence of moments and let them sit together.",
  "Collect the frames that held your attention today.",
  "Make a short visual note of this day.",
  "Let the images show what words cannot.",
  "Hold a day’s light in a handful of frames.",
  "Arrange the moments that seemed worth keeping.",
  "Submit the day’s small stories as a single post.",
  "Capture a fragment of today and give it room to breathe.",
  "Let these frames sit together—quiet, patient, and honest.",
];

export function Uploader() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [dataUrls, setDataUrls] = useState<string[]>([]);
  // Store original unedited images so we can always start fresh in the editor
  const [originalDataUrls, setOriginalDataUrls] = useState<string[]>([]);
  // Store editor settings for each image so we can restore them when reopening the editor
  const [editorSettings, setEditorSettings] = useState<EditorSettings[]>([]);
  const [alt, setAlt] = useState<string | string[]>("");
  const [caption, setCaption] = useState("");
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

  // When the image editor is open, prevent background scrolling so the overlay
  // feels like a true modal on mobile (covers full viewport and blocks interaction).
  useEffect(() => {
    if (editing) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return;
  }, [editing]);
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
      // prefer server-provided nextAllowedAt if present; otherwise compute 24h from now
      if (!can.allowed) {
        const next = can.nextAllowedAt ?? (Date.now() + 24 * 60 * 60 * 1000);
        setNextAllowedAt(next);
        // capture current total interval so we can show progress
        try { setCountdownTotalMs(next - Date.now()); } catch (e) {}
        try {
          localStorage.setItem('monolog:nextAllowedAt', String(next));
        } catch (e) {}
      } else {
        // clear any stored value if allowed
        try { localStorage.removeItem('monolog:nextAllowedAt'); } catch (e) {}
      }
    })();
  }, []);

  // update remaining countdown every second when nextAllowedAt is known
  useEffect(() => {
    // Try to read persisted value if missing
    let initial = nextAllowedAt;
    if (!initial) {
      try { const stored = localStorage.getItem('monolog:nextAllowedAt'); if (stored) initial = Number(stored); } catch (e) {}
    }
    if (!initial) return;
    
    function fmt(ms: number) {
      // Display ONLY hours and minutes; seconds are implied by a blinking colon.
      // We ceil seconds so we don't show a minute early (prevents jumping to publish too soon visually).
      if (ms <= 0) return "0:00";
      const totalSeconds = Math.ceil(ms / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${h}:${pad(m)}`; // always show hours (can be 0) for consistent layout
    }
    
    // set initial
    const ms0 = initial - Date.now();
    setRemaining(fmt(ms0));
    setRemainingMs(ms0);
    if (!countdownTotalMs) setCountdownTotalMs(ms0);
    
    const id = setInterval(() => {
      const ms = initial! - Date.now();
      if (ms <= 0) {
        setCanPost(true);
        setNextAllowedAt(null);
        setRemaining("");
        setRemainingMs(null);
        try { localStorage.removeItem('monolog:nextAllowedAt'); } catch (e) {}
        clearInterval(id);
        return;
      }
      setRemaining(fmt(ms));
      setRemainingMs(ms);
    }, 1000);
    
    return () => clearInterval(id);
  }, [nextAllowedAt]);


  const toast = useToast();
  const [showDiscardModal, setShowDiscardModal] = useState(false);
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

  // Log size stats to the console only (no UI display)
  useEffect(() => {
    if (originalSize != null) {
      try { console.info(`Original: ${Math.round(originalSize / 1024)} KB`); } catch {}
    }
  }, [originalSize]);

  useEffect(() => {
    if (compressedSize != null) {
      try { console.info(`Compressed: ${Math.round(compressedSize / 1024)} KB`); } catch {}
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
      // clear persisted draft (navigation will unmount but be safe)
      resetDraft();
      router.push("/profile");
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
  return (
    <div className="uploader view-fade">
      {/* Local styles for publish/countdown animations */}
      <style>{`
        .btn.primary.ready { animation: none; }
        body.uploader-pulse-ready .btn.primary.ready span > svg { transform-origin: center; animation: pulse 1600ms ease-in-out infinite; }
        @keyframes pulse { 0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(125,211,252,0.0)); } 50% { transform: scale(1.06); filter: drop-shadow(0 6px 14px rgba(125,211,252,0.12)); } 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(125,211,252,0.0)); } }
        /* smooth ring transition when filling */
        svg circle[stroke-dasharray] { transition: stroke-dasharray 0.9s linear; }
        /* Blinking colon for H:MM countdown */
        .remaining-time .colon { animation: blink-colon 1s steps(2,start) infinite; display:inline-block; }
        @keyframes blink-colon { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }
      `}</style>

      {!dataUrl && !dataUrls.length && (
        <div
          className="drop"
          ref={dropRef}
          tabIndex={0}
          role="button"
          aria-label="Drop an image or click to select"
          onClick={() => { if (!processing) fileInputRef.current?.click(); }}
          onKeyDown={(e) => { if (!processing && (e.key === 'Enter' || e.key === ' ')) fileInputRef.current?.click(); }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
          onDrop={async (e) => {
            e.preventDefault(); setDrag(false);
            if (processing) return;
            const file = e.dataTransfer.files?.[0];
            if (file) await handleFile(file);
          }}
        >
          {processing && (
            <div className="drop-loader" role="status" aria-live="polite">
              <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden>
                <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2a10 10 0 1 0 10 10" strokeOpacity={0.28} />
                  <path d="M12 2a10 10 0 0 0 0 20">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
                  </path>
                </g>
              </svg>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Processing image…</span>
            </div>
          )}
          <div className="drop-inner" style={{ opacity: processing ? 0.3 : 1, pointerEvents: processing ? 'none' : 'auto' }}>
            <div className="drop-icon" aria-hidden>+</div>
            <div className="drop-text">Drop images here or click to select</div>
            <div className="dim" style={{ marginTop: 6 }}>JPEG/PNG up to ~{CONFIG.imageMaxSizeMB}MB</div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button type="button" className="btn icon-reveal" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} disabled={processing}>
                <span className="icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className="reveal">Add files</span>
              </button>
              <button type="button" className="btn icon-reveal" onClick={async (e) => {
                e.stopPropagation();
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
              }} disabled={processing}>
                <span className="icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7h3l2-2h6l2 2h3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className="reveal">Take photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input (always rendered so other controls can open it) */}
      <input
        id="uploader-file-input"
        type="file"
        accept="image/*"
        ref={fileInputRef}
        multiple
        style={{ display: "none" }}
        onChange={async () => {
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
      />

      {/* Hidden camera-capable input as a fallback for devices/browsers where getUserMedia isn't available */}
      <input
        id="uploader-camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        style={{ display: "none" }}
        onChange={async () => {
          const f = cameraInputRef.current?.files?.[0];
          if (!f) return;
          await handleFile(f);
          try { cameraInputRef.current!.value = ""; } catch (_) {}
        }}
      />

  <div className={`preview ${(dataUrl || dataUrls.length) ? "" : "hidden"} ${editing ? 'editing' : ''} ${(processing || !previewLoaded) ? 'processing' : ''}`}>
        <div className={`preview-inner ${editing ? 'editing' : ''}`} style={{ position: 'relative' }}>
          {(processing || !previewLoaded) ? (
            <div className="preview-badge" role="status" aria-live="polite">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2a10 10 0 1 0 10 10" strokeOpacity={0.28} />
                  <path d="M12 2a10 10 0 0 0 0 20">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
                  </path>
                </g>
              </svg>
              <span>{processing ? 'Processing…' : 'Loading…'}</span>
            </div>
          ) : null}
          {editing && (dataUrls[editingIndex] || dataUrl) ? (
            // Render the editor in a top-level portal to avoid clipping from ancestor overflow/transform.
            <Portal>
              {/* Fullscreen overlay to ensure the editor covers the entire viewport on mobile */}
              <div
                role="dialog"
                aria-modal="true"
                style={{
                  position: 'fixed',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 12,
                  boxSizing: 'border-box',
                  // Keep overlay visually above page content but below the bottom nav
                  // (bottom nav uses z-index: 10 in globals.css). Choosing 9 lets the nav
                  // remain visible and interactive while the editor sits above the page.
                      // ensure overlay sits above persistent UI (bottom nav) and honors safe-area insets
                      zIndex: 10001,
                      background: 'color-mix(in srgb, var(--bg) 88%, rgba(0,0,0,0.32))'
                }}
                onClick={() => { /* clicking overlay will close only if desired; keep clicks outside ImageEditor to close */ setEditing(false); }}
              >
                    <div style={{ width: '100%', maxWidth: 960, margin: '0 auto', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'calc(100vh - (72px + var(--safe-bottom, 12px)) - 24px)', overflow: 'auto', paddingRight: 6, paddingBottom: 'calc(var(--safe-bottom, 12px) + 12px)'}}>
                    <input
                      className="input"
                      type="text"
                      placeholder="Alt text (describe your photo for accessibility)"
                      value={editingAlt}
                      onChange={e => setEditingAlt(e.target.value)}
                    />
                    <ImageEditor
                      initialDataUrl={(originalDataUrls[editingIndex] || originalDataUrls[0] || dataUrls[editingIndex] || dataUrl) as string}
                      initialSettings={editorSettings[editingIndex] || {}}
                      onCancel={() => setEditing(false)}
                      onApply={async (newUrl, settings) => {
                        // persist alt for this image
                        setAlt(prev => {
                          if (Array.isArray(prev)) {
                            const copy = [...prev];
                            copy[editingIndex] = editingAlt || "";
                            return copy;
                          }
                          // if single string but multiple images, convert to array
                          if (dataUrls.length > 1) {
                            const arr = dataUrls.map((_, i) => i === editingIndex ? (editingAlt || "") : (i === 0 ? (prev as string) || "" : ""));
                            return arr;
                          }
                          return editingAlt || "";
                        });
                        // persist the settings for this image
                        setEditorSettings(prev => {
                          const copy = [...prev];
                          while (copy.length <= editingIndex) copy.push({});
                          copy[editingIndex] = settings;
                          return copy;
                        });
                        setEditing(false);
                        // run through the same compression pipeline to ensure final image obeys limits
                        setProcessing(true);
                        try {
                          const compressed = await compressImage(newUrl as any);
                          // replace the edited image at editingIndex
                          setDataUrls(d => {
                            const copy = [...d];
                            copy[editingIndex] = compressed;
                            return copy;
                          });
                          // DO NOT update originalDataUrls - keep the original unedited version
                          // if editing the main preview index, update dataUrl too
                          if (editingIndex === 0) { setDataUrl(compressed); setPreviewLoaded(false); }
                          setCompressedSize(approxDataUrlBytes(compressed));
                          // approximate original size from dataurl length
                          setOriginalSize(approxDataUrlBytes(newUrl));
                        } catch (e) {
                          console.error(e);
                          // fallback to the edited url directly
                          setDataUrls(d => {
                            const copy = [...d];
                            copy[editingIndex] = newUrl as string;
                            return copy;
                          });
                          if (editingIndex === 0) { setDataUrl(newUrl as string); setPreviewLoaded(false); }
                          setCompressedSize(approxDataUrlBytes(newUrl as string));
                        } finally {
                          setProcessing(false);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </Portal>
          ) : (
            <>
              {dataUrls.length > 1 ? (
                    <div style={{ width: '100%' }}>
                      <div className="carousel-wrapper" tabIndex={0} onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
                        if (e.key === 'ArrowRight') setIndex(i => Math.min(dataUrls.length - 1, i + 1));
                      }}>
                        <div className="edge-area left" />
                        <div className="edge-area right" />
                        <div className="carousel-track" ref={trackRef} onTouchStart={(e) => {
                          touchStartX.current = e.touches[0].clientX; touchDeltaX.current = 0;
                        }} onTouchMove={(e) => {
                          if (touchStartX.current == null) return;
                          touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
                          if (trackRef.current) trackRef.current.style.transform = `translateX(calc(-${index * 100}% + ${touchDeltaX.current}px))`;
                        }} onTouchEnd={() => {
                          if (touchStartX.current == null) return;
                          const delta = touchDeltaX.current; const threshold = 40;
                          let target = index;
                          if (delta > threshold) target = Math.max(0, index - 1);
                          else if (delta < -threshold) target = Math.min(dataUrls.length - 1, index + 1);
                          setIndex(target);
                          if (trackRef.current) trackRef.current.style.transform = `translateX(-${target * 100}%)`;
                          touchStartX.current = null; touchDeltaX.current = 0;
                        }} role="list">
                          {dataUrls.map((u, idx) => (
            <div className="carousel-slide" key={idx} role="listitem" aria-roledescription="slide" aria-label={`Preview ${idx+1} of ${dataUrls.length}`} style={{ position: 'relative' }}>
                          <img alt={(Array.isArray(alt) ? (alt[idx] || '') : (alt || `Preview ${idx+1}`))} src={u} onLoad={() => setPreviewLoaded(true)} onError={() => setPreviewLoaded(true)} />
                              <button
                                className="btn"
                                style={{ position: 'absolute', right: 8, bottom: 8 }}
                                onClick={() => { setEditingIndex(idx); setEditing(true); setIndex(idx); }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn"
                                style={{ position: 'absolute', right: 8, bottom: 56 }}
                                onClick={() => {
                                  // open camera to replace this image
                                  fileActionRef.current = 'replace';
                                  replaceIndexRef.current = idx;
                                  // try getUserMedia first
                                  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                                    (async () => {
                                      setCameraOpen(true);
                                      try {
                                        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
                                        streamRef.current = s;
                                        if (videoRef.current) videoRef.current.srcObject = s;
                                      } catch (e) {
                                        console.error(e);
                                        toast.show('Camera access denied or unavailable');
                                        setCameraOpen(false);
                                        try { fileActionRef.current = 'replace'; cameraInputRef.current?.click(); } catch (_) {}
                                      }
                                    })();
                                  } else {
                                    try { fileActionRef.current = 'replace'; cameraInputRef.current?.click(); } catch (_) {}
                                  }
                                }}
                              >
                                Capture
                              </button>
                            </div>
                          ))}
                        </div>

                        <button className="carousel-arrow left" onClick={() => setIndex(i => Math.max(0, i - 1))} aria-label="Previous image">‹</button>
                        <button className="carousel-arrow right" onClick={() => setIndex(i => Math.min(dataUrls.length - 1, i + 1))} aria-label="Next image">›</button>

                        <div className="carousel-dots" aria-hidden="false">
                          {dataUrls.map((_, i) => (
                            <button key={i} className={`dot ${i === index ? 'active' : ''}`} onClick={() => setIndex(i)} aria-label={`Show preview ${i + 1}`} />
                          ))}
                        </div>
                      </div>
                    </div>
              ) : (
                <div>
                  <img alt={Array.isArray(alt) ? (alt[0] || 'Preview') : (alt || 'Preview')} src={dataUrls[0] || dataUrl || ""} onLoad={() => setPreviewLoaded(true)} onError={() => setPreviewLoaded(true)} />
                      { (dataUrl || dataUrls.length === 1) ? (
                        <>
                          <button
                            className="btn"
                            style={{ position: 'absolute', right: 8, bottom: 8 }}
                            onClick={() => { setEditingIndex(0); setEditing(true); }}
                          >
                            Edit photo
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ position: 'absolute', right: 100, bottom: 8, zIndex: 8, padding: '6px 12px' }}
                            onClick={() => {
                              if (processing) return;
                              fileActionRef.current = 'replace';
                              replaceIndexRef.current = dataUrls.length ? index : 0;
                              // Keep the current preview visible; open picker for replacement
                              setEditing(false);
                              try {
                                if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = "";
                              } catch (e) {}
                              try { fileInputRef.current?.click(); } catch (e) {}
                            }}
                          >
                            Change photo
                          </button>
                        </>
                      ) : null }
                </div>
              )}
            </>
          )}
        </div>

        {/* Camera modal (getUserMedia) */}
        {cameraOpen ? (
          <Portal>
            <div
              role="dialog"
              aria-modal={true}
              style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, zIndex: 20, background: 'rgba(0,0,0,0.6)' }}
              onClick={() => {
                // close on overlay click
                try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch (_) {}
                streamRef.current = null;
                setCameraOpen(false);
              }}
            >
              <div style={{ width: '100%', maxWidth: 720, background: 'var(--bg)', borderRadius: 8, padding: 12 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 6, background: '#000' }} />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button className="btn" onClick={async () => {
                      const v = videoRef.current;
                      const s = streamRef.current;
                      if (!v || !s) return;
                      setProcessing(true); // Show loader while capturing
                      try {
                        const w = v.videoWidth || v.clientWidth;
                        const h = v.videoHeight || v.clientHeight || Math.round(w * 0.75);
                        const cnv = document.createElement('canvas');
                        cnv.width = w; cnv.height = h;
                        const ctx = cnv.getContext('2d');
                        if (!ctx) throw new Error('Canvas not supported');
                        ctx.drawImage(v, 0, 0, w, h);
                        // convert to blob and call handleFile
                        cnv.toBlob(async (blob) => {
                          if (!blob) return;
                          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
                          // if replacing, handle specially
                          if (fileActionRef.current === 'replace') {
                            try {
                              const url = await compressImage(file);
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
                                setDataUrl(url);
                                setPreviewLoaded(false);
                                setDataUrls([url]);
                                setOriginalDataUrls([url]);
                                setEditorSettings([{}]);
                              }
                              setOriginalSize(approxDataUrlBytes(file as any));
                              fileActionRef.current = 'append';
                              replaceIndexRef.current = null;
                            } catch (e) {
                              console.error(e);
                              toast.show('Failed to process captured image');
                            } finally {
                              setProcessing(false);
                            }
                          } else {
                            await handleFile(file);
                          }
                          try { s.getTracks().forEach(t => t.stop()); } catch (_) {}
                          streamRef.current = null;
                          setCameraOpen(false);
                        }, 'image/jpeg', 0.92);
                      } catch (e) {
                        console.error(e);
                        toast.show('Failed to capture photo');
                        setProcessing(false);
                      }
                    }} disabled={processing}>
                      {processing ? (
                        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                            <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M12 2a10 10 0 1 0 10 10" strokeOpacity={0.28} />
                              <path d="M12 2a10 10 0 0 0 0 20">
                                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
                              </path>
                            </g>
                          </svg>
                          <span>Processing…</span>
                        </span>
                      ) : 'Capture'}
                    </button>
                    <button className="btn ghost" onClick={() => {
                      try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch (_) {}
                      streamRef.current = null;
                      setCameraOpen(false);
                    }}>Close</button>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        ) : null}

        {/* thumbnail strip placed outside preview-inner so it isn't clipped */}
        {dataUrls.length > 1 ? (
          <div className="thumbs">
            {dataUrls.map((u, idx) => (
              <button key={idx} type="button" onClick={() => { setIndex(idx); }} aria-pressed={index === idx} style={{ border: index === idx ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                <img src={u} alt={Array.isArray(alt) ? (alt[idx] || `Thumbnail ${idx+1}`) : (alt || `Thumbnail ${idx+1}`)} />
              </button>
            ))}
          </div>
        ) : null}

        {/* The explicit "Exit edit" button was removed because Cancel performs the same action.
           Keeping the code minimal prevents overlap/clipping at odd zoom levels. */}
      </div>

      {/* When processing, blur the visible preview and show a small badge instead of the fullscreen overlay */}

      <div style={{ marginTop: 8 }}>
        {compressedSize != null && compressedSize > CONFIG.imageMaxSizeMB * 1024 * 1024 ? (
          <div className="warn">Compressed image exceeds the maximum of {CONFIG.imageMaxSizeMB} MB. Please resize or choose a smaller file.</div>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="input-wrapper" style={{ flex: 1, position: 'relative' }}>
          {/** keep the ghost/typewriter visible even before a photo is selected,
           *  but prevent the input from being focused/edited until an image exists */}
          {(!caption && typed) ? (
            <span
              className="input-ghost-placeholder"
              aria-hidden="true"
              style={{ ['--len' as any]: String(typed.length), ['--steps' as any]: String(typed.length) }}
            >
              <span className="typewriter">{typed}</span>
              {/* use a thinner vertical bar and slightly smaller size so the caret is less obtrusive */}
              <span className="caret" aria-hidden style={{ fontSize: 14, transform: 'translateY(-1px)' }}>|</span>
            </span>
          ) : null}

          <input
            className="input"
            type="text"
            aria-label="Caption"
            placeholder={caption ? undefined : ''}
            value={caption}
            onChange={e => setCaption(e.target.value)}
            readOnly={!(dataUrl || dataUrls.length > 0) || processing}
            tabIndex={(dataUrl || dataUrls.length > 0) ? 0 : -1}
            onMouseDown={(e) => {
              // Block mouse interaction when no image is selected so clicks don't focus the input
              if (!(dataUrl || dataUrls.length > 0) || processing) e.preventDefault();
            }}
            style={{ width: '100%', cursor: (!(dataUrl || dataUrls.length > 0) || processing) ? 'not-allowed' : 'text' }}
          />
        </div>
        {/* alt editing moved into the photo editor so it only shows when editing a specific image */}
      </div>

      {/* alt editing appears inside the ImageEditor modal when editing a photo */}
      {(dataUrl || dataUrls.length > 0) ? (
        <div className="form-row">
          <label className="vis-label">
            <span className="dim">Visibility</span>
            <div>
              <button
                type="button"
                role="switch"
                aria-checked={visibility === 'private'}
                aria-label={visibility === 'private' ? 'Make post public' : 'Make post private'}
                className={`vis-toggle btn ${visibility === 'private' ? 'private' : 'public'}`}
                onClick={() => setVisibility(v => v === 'public' ? 'private' : 'public')}
              >
                <span className="vis-icon" aria-hidden>
                  {/* eye open */}
                  <svg className="eye-open" viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" />
                  </svg>
                  {/* eye closed / eye-off */}
                  <svg className="eye-closed" viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a20.16 20.16 0 0 1 5.06-5.94" stroke="currentColor" />
                    <path d="M1 1l22 22" stroke="currentColor" />
                  </svg>
                </span>
                <span style={{ marginLeft: 4 }}>{visibility === 'private' ? 'Private' : 'Public'}</span>
              </button>
            </div>
          </label>

          <div className="btn-group">
            {/* Publish / Countdown button with animated icon and ring */}
            <button
              className={`btn primary ${canPost ? 'ready' : 'cooldown'}`}
              onClick={() => publish(false)}
              disabled={
                processing ||
                (compressedSize !== null && compressedSize > CONFIG.imageMaxSizeMB * 1024 * 1024) ||
                (canPost === false)
              }
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
            >
              {/* Icon + ring */}
              <span style={{ display: 'inline-block', width: 36, height: 36, position: 'relative' }} aria-hidden>
                <svg viewBox="0 0 36 36" width="36" height="36" style={{ display: 'block' }}>
                  <defs>
                    <linearGradient id="g1" x1="0%" x2="100%">
                      <stop offset="0%" stopColor="var(--primary)" />
                      <stop offset="100%" stopColor="#7dd3fc" />
                    </linearGradient>
                  </defs>
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="4" />
                  {/* progress path */}
                  {remainingMs != null && countdownTotalMs ? (
                    (() => {
                      const pct = Math.max(0, Math.min(1, 1 - remainingMs / countdownTotalMs));
                      const circumference = 2 * Math.PI * 15;
                      const dash = String(circumference * pct);
                      const dashGap = String(Math.max(0, circumference - circumference * pct));
                      return (
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          stroke="url(#g1)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${dash} ${dashGap}`}
                          transform="rotate(-90 18 18)"
                        />
                      );
                    })()
                  ) : null}
                </svg>

                {/* small center icon that pulses when ready */}
                <span style={{ position: 'absolute', left: 6, top: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" style={{ display: 'block', color: 'white' }}>
                    <circle cx="12" cy="12" r="10" fill={canPost ? 'var(--primary)' : 'rgba(255,255,255,0.06)'} />
                    <path d="M8 12l2 2 6-6" fill="none" stroke={canPost ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </span>

              <span style={{ fontWeight: 600, lineHeight: '20px', whiteSpace: 'nowrap' }}>
                {processing
                  ? "Processing…"
                  : canPost === false
                  ? nextAllowedAt
                    ? (
                        <>
                          Next post in {(() => {
                            if (!remaining) return "0:00";
                            const parts = remaining.split(":");
                            if (parts.length === 2) {
                              return (
                                <span className="remaining-time" aria-label={`Next post in ${parts[0]} hours and ${parts[1]} minutes`}>
                                  <span className="h" aria-hidden>{parts[0]}</span>
                                  <span className="colon" aria-hidden>:</span>
                                  <span className="m" aria-hidden>{parts[1]}</span>
                                </span>
                              );
                            }
                            return remaining;
                          })()}
                        </>
                      )
                    : "Publish again in 24h"
                  : "Publish"}
              </span>
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setShowDiscardModal(true)}
              disabled={processing}
              style={{ marginLeft: 8 }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div aria-live="polite" className="sr-only status">
        {/* screen-reader updates for processing/errors */}
      </div>
      <ConfirmModal
        open={showDiscardModal}
        title="Discard this draft?"
        description="You will lose selected photos and caption."
        confirmLabel="Discard"
        cancelLabel="Keep"
        onCancel={() => setShowDiscardModal(false)}
        onConfirm={() => { setShowDiscardModal(false); resetDraft(); }}
      />
    </div>
  );
}