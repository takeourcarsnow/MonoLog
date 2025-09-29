/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { compressImage, approxDataUrlBytes } from "@/lib/image";
import { CONFIG } from "@/lib/config";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import ImageEditor from "./ImageEditor";
export function Uploader() {
  const [showAltInput, setShowAltInput] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [dataUrls, setDataUrls] = useState<string[]>([]);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [processing, setProcessing] = useState(false);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [canReplace, setCanReplace] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number>(0);
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
  }, [dataUrls.length]);

  // apply transform when index changes
  useEffect(() => {
    if (trackRef.current) trackRef.current.style.transform = `translateX(-${index * 100}%)`;
  }, [index]);

  useEffect(() => {
    (async () => {
      const can = await api.canPostToday();
      setCanReplace(!can.allowed);
    })();
  }, []);

  const toast = useToast();

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
      // set the primary preview to the first image
      if (!dataUrl) setDataUrl(url);
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
                  if (replaceAt === 0) setDataUrl(url);
                } else {
                  // no array yet, just set primary preview
                  setDataUrl(url);
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

      <div className={`preview ${(dataUrl || dataUrls.length) ? "" : "hidden"} ${editing ? 'editing' : ''}`}>
        <div className={`preview-inner ${editing ? 'editing' : ''}`} style={{ position: 'relative' }}>
          {editing && (dataUrls[editingIndex] || dataUrl) ? (
            <div style={{ width: '100%' }}>
              <ImageEditor
                initialDataUrl={(dataUrls[editingIndex] || dataUrl) as string}
                onCancel={() => setEditing(false)}
                onApply={async (newUrl) => {
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
                    if (editingIndex === 0) setDataUrl(compressed);
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
                    if (editingIndex === 0) setDataUrl(newUrl as string);
                    setCompressedSize(approxDataUrlBytes(newUrl as string));
                  } finally {
                    setProcessing(false);
                  }
                }}
              />
            </div>
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
                              <img alt={(Array.isArray(alt) ? alt[idx] : alt) || `Preview ${idx+1}`} src={u} />
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
                  <img alt={alt || 'Preview'} src={dataUrls[0] || dataUrl || ""} />
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
                <img src={u} alt={`thumb-${idx}`} />
              </button>
            ))}
          </div>
        ) : null}

        {/* The explicit "Exit edit" button was removed because Cancel performs the same action.
           Keeping the code minimal prevents overlap/clipping at odd zoom levels. */}
      </div>

      {/* global processing overlay (covers preview / drop area) */}
      {processing ? (
        <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, pointerEvents: 'auto' }}>
          <div role="status" aria-live="polite" style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', padding: 18, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <svg width={56} height={56} viewBox="0 0 50 50" aria-hidden>
              <g fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round">
                <path d="M25 5 a20 20 0 0 1 0 40" strokeOpacity={0.18} />
                <path d="M25 5 a20 20 0 0 1 0 40">
                  <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
                </path>
              </g>
            </svg>
            <div style={{ fontWeight: 700 }}>Processing…</div>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 8 }}>
        {compressedSize != null && compressedSize > CONFIG.imageMaxSizeMB * 1024 * 1024 ? (
          <div className="warn">Compressed image exceeds the maximum of {CONFIG.imageMaxSizeMB} MB. Please resize or choose a smaller file.</div>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="input"
          type="text"
          placeholder="Caption (optional)"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn ghost"
          onClick={() => setShowAltInput(v => !v)}
          aria-pressed={showAltInput}
          style={{ whiteSpace: 'nowrap' }}
        >
          {alt ? 'Edit alt' : 'Add alt text'}
        </button>
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

      {showAltInput ? (
        <input
          className="input"
          type="text"
          placeholder="Alt text (describe your photo for accessibility)"
          value={alt}
          onChange={e => setAlt(e.target.value)}
        />
      ) : null}
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
          <button className="btn primary" onClick={() => publish(false)} disabled={processing || (compressedSize !== null && compressedSize > CONFIG.imageMaxSizeMB * 1024 * 1024)}>
            {processing ? "Processing…" : canReplace ? "Publish (new day)" : "Publish"}
          </button>
          <button
            className={`btn ghost replace ${canReplace ? "" : "hidden"}`}
            onClick={() => publish(true)}
            disabled={processing}
          >
            Replace
          </button>
        </div>
      </div>

      <div aria-live="polite" className="sr-only status">
        {/* screen-reader updates for processing/errors */}
      </div>
    </div>
  );
}