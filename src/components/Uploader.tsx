/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { compressImage, approxDataUrlBytes } from "@/lib/image";
import { CONFIG } from "@/lib/config";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import ImageEditor from "./ImageEditor";
import Portal from "./Portal";

// the canonical list of philosophical prompts used for rotation and animated typing
const PHRASES = [
  "Frame the moment: what light or silence does this image keep?",
  "Tell the small truth this photograph remembers about you.",
  "Describe the world that sat still for this instant.",
  "If this image had its own story, how would it begin?",
  "Name the feeling that first arrived when you took this.",
  "What does time leave behind in this single frame?",
];

export function Uploader() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [dataUrls, setDataUrls] = useState<string[]>([]);
  const [alt, setAlt] = useState<string | string[]>("");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [processing, setProcessing] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [canPost, setCanPost] = useState<boolean | null>(null);
  const [nextAllowedAt, setNextAllowedAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<string>("");
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
  const [placeholder, setPlaceholder] = useState<string>(
    "Tell your story (if you feel like it)"
  );
  // typed text for the JS-driven typing/backspace animation
  const [typed, setTyped] = useState<string>("");
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      if (ms <= 0) return "00:00:00";
      // friendly localized formatting: H:MM:SS or MM:SS
      const total = Math.floor(ms / 1000);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      const pad = (n: number) => String(n).padStart(2, "0");
      if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
      return `${m}:${pad(s)}`;
    }
    // set initial
    setRemaining(fmt(initial - Date.now()));
    const id = setInterval(() => {
      const ms = initial! - Date.now();
      if (ms <= 0) {
        setCanPost(true);
        setNextAllowedAt(null);
        setRemaining("");
        try { localStorage.removeItem('monolog:nextAllowedAt'); } catch (e) {}
        clearInterval(id);
        return;
      }
      setRemaining(fmt(ms));
    }, 1000);
    return () => clearInterval(id);
  }, [nextAllowedAt]);

  const toast = useToast();

  // rotate a friendly placeholder message on each page load; persist index so reloads cycle
  useEffect(() => {
    const key = "monolog:captionPlaceholderIndex";
    try {
      const raw = localStorage.getItem(key);
      let idx = Number.isFinite(Number(raw)) ? Number(raw) : -1;
      idx = (idx + 1) % PHRASES.length;
      localStorage.setItem(key, String(idx));
      setPlaceholder(PHRASES[idx]);
    } catch (e) {
      // localStorage might not be available; silently fallback to default
      setPlaceholder(PHRASES[0]);
    }
  }, []);

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
      // mark preview as not yet loaded so blur remains until the <img> onLoad fires
      setPreviewLoaded(false);
      // set the primary preview to the first image
  if (!dataUrl) { setDataUrl(url); setPreviewLoaded(false); }
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
      // navigation will unmount this component; no need to clear processing here
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

  return (
    <div className="uploader view-fade">
      <div className="toolbar">
        <div>
          <strong>Post your photos for today</strong>
          <div className="dim">Attach up to 5 images — one post per day</div>
        </div>
      </div>

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
          <div className="drop-inner">
            <div className="drop-icon" aria-hidden>+</div>
            <div className="drop-text">Drop image here or click to select</div>
            <div className="dim" style={{ marginTop: 6 }}>JPEG/PNG up to ~{CONFIG.imageMaxSizeMB}MB</div>
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
                  if (replaceAt === 0) { setDataUrl(url); setPreviewLoaded(false); }
                } else {
                  // no array yet, just set primary preview
                  setDataUrl(url);
                  setPreviewLoaded(false);
                  setDataUrls([url]);
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

  <div className={`preview ${(dataUrl || dataUrls.length) ? "" : "hidden"} ${editing ? 'editing' : ''} ${(processing || !previewLoaded) ? 'processing' : ''}`}>
        <div className={`preview-inner ${editing ? 'editing' : ''}`} style={{ position: 'relative' }}>
          {processing ? (
            <div className="preview-badge" role="status" aria-live="polite">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2a10 10 0 1 0 10 10" strokeOpacity={0.28} />
                  <path d="M12 2a10 10 0 0 0 0 20">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
                  </path>
                </g>
              </svg>
              <span>Processing…</span>
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
                  zIndex: 9,
                  background: 'color-mix(in srgb, var(--bg) 88%, rgba(0,0,0,0.32))'
                }}
                onClick={() => { /* clicking overlay will close only if desired; keep clicks outside ImageEditor to close */ setEditing(false); }}
              >
                <div style={{ width: '100%', maxWidth: 960, margin: '0 auto', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'calc(100vh - (72px + var(--safe-bottom)) - 24px)', overflow: 'auto', paddingRight: 6 }}>
                    <input
                      className="input"
                      type="text"
                      placeholder="Alt text (describe your photo for accessibility)"
                      value={editingAlt}
                      onChange={e => setEditingAlt(e.target.value)}
                    />
                    <ImageEditor
                      initialDataUrl={(dataUrls[editingIndex] || dataUrl) as string}
                      onCancel={() => setEditing(false)}
                      onApply={async (newUrl) => {
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
                    <button
                      className="btn"
                      style={{ position: 'absolute', right: 8, bottom: 8 }}
                      onClick={() => { setEditingIndex(0); setEditing(true); }}
                    >
                      Edit photo
                    </button>
                  ) : null }
                </div>
              )}
            </>
          )}
        </div>

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
          <input
            className="input"
            type="text"
            aria-label="Caption"
            placeholder={caption ? undefined : ''}
            value={caption}
            onChange={e => setCaption(e.target.value)}
            style={{ width: '100%' }}
          />
          {(!caption && typed) ? (
            <span
              className="input-ghost-placeholder"
              aria-hidden="true"
              style={{ ['--len' as any]: String(typed.length), ['--steps' as any]: String(typed.length) }}
            >
              <span className="typewriter">{typed}</span>
              <span className="caret" aria-hidden>▌</span>
            </span>
          ) : null}
        </div>
        {/* alt editing moved into the photo editor so it only shows when editing a specific image */}
        {dataUrl ? (
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              if (processing) return;
              // prepare to replace the currently visible image
              fileActionRef.current = 'replace';
              replaceIndexRef.current = dataUrls.length ? index : 0;
              setDataUrl(null);
              setOriginalSize(null);
              setCompressedSize(null);
              setAlt("");
              setCaption("");
              setEditing(false);
              try {
                if (fileInputRef.current) {
                  // clear previous value so selecting the same file again will fire change
                  (fileInputRef.current as HTMLInputElement).value = "";
                }
              } catch (e) {}
              // open file picker so the user can choose a replacement
              try { fileInputRef.current?.click(); } catch (e) {}
            }}
            style={{ whiteSpace: 'nowrap' }}
          >
            Change photo
          </button>
        ) : null}
      </div>

      {/* alt editing appears inside the ImageEditor modal when editing a photo */}
      <div className="form-row">
        <label className="vis-label">
          <span className="dim">Visibility</span>
            <div role="radiogroup" aria-label="Post visibility" style={{ display: 'inline-flex', gap: 8 }}>
              <button
                type="button"
                data-type="public"
                aria-label="Make post public"
                className={`btn ${visibility === 'public' ? 'active' : ''}`}
                aria-pressed={visibility === 'public'}
                onClick={() => setVisibility('public')}
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
                Public
              </button>
              <button
                type="button"
                data-type="private"
                aria-label="Make post private"
                className={`btn ${visibility === 'private' ? 'active' : ''}`}
                aria-pressed={visibility === 'private'}
                onClick={() => setVisibility('private')}
              >
                <span className="vis-icon" aria-hidden>
                  <svg className="eye-open" viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" />
                  </svg>
                  <svg className="eye-closed" viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a20.16 20.16 0 0 1 5.06-5.94" stroke="currentColor" />
                    <path d="M1 1l22 22" stroke="currentColor" />
                  </svg>
                </span>
                Private
              </button>
            </div>
        </label>

        <div className="btn-group">
          <button
            className="btn primary"
            onClick={() => publish(false)}
            disabled={
              processing ||
              (compressedSize !== null && compressedSize > CONFIG.imageMaxSizeMB * 1024 * 1024) ||
              (canPost === false)
            }
          >
            {processing
              ? "Processing…"
              : canPost === false
              ? nextAllowedAt
                ? `Next post in ${remaining}`
                : "Publish again in 24h"
              : "Publish"}
          </button>
          {/* replace button removed */}
        </div>
      </div>

      <div aria-live="polite" className="sr-only status">
        {/* screen-reader updates for processing/errors */}
      </div>
    </div>
  );
}