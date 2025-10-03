import { usePathname } from "next/navigation";
import ImageEditor from "../ImageEditor";
import { EditorSettings } from "../imageEditor/types";
import Portal from "../Portal";
import { compressImage, approxDataUrlBytes } from "@/lib/image";

interface PreviewSectionProps {
  dataUrl: string | null;
  dataUrls: string[];
  originalDataUrls: string[];
  editorSettings: EditorSettings[];
  alt: string | string[];
  editing: boolean;
  editingIndex: number;
  setEditingIndex: React.Dispatch<React.SetStateAction<number>>;
  editingAlt: string;
  setAlt: React.Dispatch<React.SetStateAction<string | string[]>>;
  setEditorSettings: React.Dispatch<React.SetStateAction<EditorSettings[]>>;
  setDataUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setOriginalDataUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setDataUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setPreviewLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  setCompressedSize: React.Dispatch<React.SetStateAction<number | null>>;
  setOriginalSize: React.Dispatch<React.SetStateAction<number | null>>;
  setProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  processing: boolean;
  previewLoaded: boolean;
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  trackRef: React.RefObject<HTMLDivElement>;
  touchStartX: React.MutableRefObject<number | null>;
  touchDeltaX: React.MutableRefObject<number>;
  cameraOpen: boolean;
  setCameraOpen: React.Dispatch<React.SetStateAction<boolean>>;
  videoRef: React.RefObject<HTMLVideoElement>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  fileActionRef: React.MutableRefObject<'append' | 'replace'>;
  replaceIndexRef: React.MutableRefObject<number | null>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  cameraInputRef: React.RefObject<HTMLInputElement>;
  toast: any;
  handleFile: (file: File) => Promise<void>;
}

export function PreviewSection({
  dataUrl,
  dataUrls,
  originalDataUrls,
  editorSettings,
  alt,
  editing,
  editingIndex,
  setEditingIndex,
  editingAlt,
  setAlt,
  setEditorSettings,
  setDataUrls,
  setOriginalDataUrls,
  setDataUrl,
  setPreviewLoaded,
  setCompressedSize,
  setOriginalSize,
  setProcessing,
  setEditing,
  processing,
  previewLoaded,
  index,
  setIndex,
  trackRef,
  touchStartX,
  touchDeltaX,
  cameraOpen,
  setCameraOpen,
  videoRef,
  streamRef,
  fileActionRef,
  replaceIndexRef,
  fileInputRef,
  cameraInputRef,
  toast,
  handleFile
}: PreviewSectionProps) {
  const pathname = usePathname();

  const onCameraCapture = async () => {
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
  };

  return (
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
        {/* Keep the preview DOM mounted to avoid layout shifts when opening the editor. */}
        {/* ImageEditor moved inline into the main form below — keep preview DOM unchanged here. */}

        {/* Render either the ImageEditor inline (replacing the visible photo) or the preview content. */}
        {editing && pathname === '/upload' && (dataUrls[editingIndex] || dataUrl) ? (
          <div style={{ width: '100%' }}>
            <ImageEditor
              initialDataUrl={(originalDataUrls[editingIndex] || originalDataUrls[0] || dataUrls[editingIndex] || dataUrl) as string}
              initialSettings={editorSettings[editingIndex] || {}}
              onCancel={() => setEditing(false)}
              onApply={async (newUrl, settings) => {
                setAlt(prev => {
                  if (Array.isArray(prev)) {
                    const copy = [...prev];
                    copy[editingIndex] = editingAlt || "";
                    return copy;
                  }
                  if (dataUrls.length > 1) {
                    const arr = dataUrls.map((_, i) => i === editingIndex ? (editingAlt || "") : (i === 0 ? (prev as string) || "" : ""));
                    return arr;
                  }
                  return editingAlt || "";
                });
                setEditorSettings(prev => {
                  const copy = [...prev];
                  while (copy.length <= editingIndex) copy.push({});
                  copy[editingIndex] = settings;
                  return copy;
                });
                setProcessing(true);
                try {
                  const compressed = await compressImage(newUrl as any);
                  setDataUrls(d => {
                    const copy = [...d];
                    copy[editingIndex] = compressed;
                    return copy;
                  });
                  if (editingIndex === 0) { setDataUrl(compressed); setPreviewLoaded(false); }
                  setCompressedSize(approxDataUrlBytes(compressed));
                  setOriginalSize(approxDataUrlBytes(newUrl));
                } catch (e) {
                  console.error(e);
                  setDataUrls(d => {
                    const copy = [...d];
                    copy[editingIndex] = newUrl as string;
                    return copy;
                  });
                  if (editingIndex === 0) { setDataUrl(newUrl as string); setPreviewLoaded(false); }
                  setCompressedSize(approxDataUrlBytes(newUrl as string));
                } finally {
                  setProcessing(false);
                  setEditing(false);
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
                    <div className="image-actions">
                      <button
                        className="image-action-btn edit-btn"
                        aria-label="Edit photo"
                        onClick={() => { setEditingIndex(0); setEditing(true); }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="image-action-btn change-btn"
                        aria-label="Change photo"
                        onClick={() => {
                          if (processing) return;
                          fileActionRef.current = 'replace';
                          replaceIndexRef.current = dataUrls.length ? index : 0;
                          setEditing(false);
                          try {
                            if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = "";
                          } catch (e) {}
                          try { fileInputRef.current?.click(); } catch (e) {}
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </button>
                    </div>
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
                  <button className="btn" onClick={onCameraCapture} disabled={processing}>
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

      {/* inline editor render handled earlier in the preview area; modal Portal removed */}
    </div>
  );
}