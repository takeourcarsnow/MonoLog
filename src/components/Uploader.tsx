/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { AuthForm } from "./AuthForm";
import { compressImage, approxDataUrlBytes } from "@/lib/image";
import { CONFIG } from "@/lib/config";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./uploader/useAuth";
import { useDraftPersistence } from "./uploader/useDraftPersistence";
import { useCountdown } from "./uploader/useCountdown";
import { useTypingAnimation } from "./uploader/useTypingAnimation";
import { useCameraCapture } from "./uploader/useCameraCapture";
import { useFileHandling } from "./uploader/useFileHandling";
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
  const { me, setMe } = useAuth();

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
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number>(0);
  const [editingAlt, setEditingAlt] = useState<string>("");
  const pathname = usePathname();

  const [index, setIndex] = useState<number>(0);

  // Use hooks
  const { canPost, nextAllowedAt, remaining, remainingMs, countdownTotalMs } = useCountdown();
  const { placeholder, typed } = useTypingAnimation(caption);
  const { cameraOpen, setCameraOpen, videoRef, streamRef, openCamera, closeCamera } = useCameraCapture();
  const [processing, setProcessing] = useState(false);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const { handleFile: handleFileProcessing } = useFileHandling();

  // Use draft persistence hook
  useDraftPersistence(
    dataUrls, setDataUrls,
    originalDataUrls, setOriginalDataUrls,
    editorSettings, setEditorSettings,
    dataUrl, setDataUrl,
    caption, setCaption,
    alt, setAlt,
    visibility, setVisibility,
    compressedSize, setCompressedSize,
    originalSize, setOriginalSize,
    index, setIndex
  );

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
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileActionRef = useRef<'append' | 'replace'>('append');
  const replaceIndexRef = useRef<number | null>(null);
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

  const toast = useToast();
  // Inline cancel confirmation (double tap to discard draft)
  const [confirmCancel, setConfirmCancel] = useState(false);
  const confirmCancelTimerRef = useRef<number | null>(null);

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
            try {
              await openCamera();
            } catch (e) {
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
          const files = Array.from(fileInputRef.current?.files || []).slice(0, 5);
          if (fileActionRef.current === 'replace') {
            // replace only the first selected file at the provided index
            // If the user selected multiple files while in "replace" mode,
            // treat it as replacing the single image with the selected set
            // (convert single->multi). Otherwise just replace the single file.
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
                  // Replace existing state with the new selection (limit 5)
                  const next = newUrls.slice(0, 5);
                  setDataUrls(next);
                  setOriginalDataUrls(next.slice());
                  setEditorSettings(next.map(() => ({})));
                  setDataUrl(next[0]);
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
            }
            // reset action
            fileActionRef.current = 'append';
            replaceIndexRef.current = null;
          } else {
            // Batch-process selections to avoid interleaved state updates which
            // could leave only the first image visible in the preview.
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
              // Append all new urls in a single state update
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
              // ensure primary preview is set to the first image if not already
              if (!dataUrl) {
                setDataUrl(newUrls[0]);
                setPreviewLoaded(false);
              }
              // set size hints using the first processed file
              try { setCompressedSize(approxDataUrlBytes(newUrls[0])); } catch (_) {}
              try { setOriginalSize(files[0].size); } catch (_) {}
            } finally {
              setProcessing(false);
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