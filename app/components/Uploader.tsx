/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect } from "react";
import { lazy, Suspense } from "react";
import { api } from "@/src/lib/api";
import { AuthForm } from "./AuthForm";
import { compressImage, approxDataUrlBytes } from "@/src/lib/image";
import { CONFIG } from "@/src/lib/config";
import { useAuth } from "@/src/lib/hooks/useAuth";
import { useToast } from "./Toast";
import { AuthRequired } from "./AuthRequired";
import { DropZone } from "./uploader/DropZone";
import Portal from "./Portal";
import { FileInputs } from "./uploader/FileInputs";
import { PreviewSection } from "./uploader/PreviewSection";
import { CaptionInput } from "./uploader/CaptionInput";
import { PublishControls } from "./uploader/PublishControls";
import { useUploader } from "./uploader/useUploader";
import { initFocusDebug } from "./uploader/focusDebug";

// Lazy load the heavy ImageEditor component
const ImageEditor = lazy(() => import("./ImageEditor"));

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
      <AuthRequired>
        <AuthForm onClose={async () => setMe(await api.getCurrentUser())} />
      </AuthRequired>
    );
  }
  return <UploaderCore />;
}

function UploaderCore() {
  // Dev helper to trace focus events; no-op in production
  initFocusDebug();
  const {
    // State
    dataUrls,
    originalDataUrls,
    editorSettings,
    alt,
    caption,
  spotifyLink,
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
  remaining,
  remainingMs,
  countdownTotalMs,
    cameraOpen,
    setCameraOpen,
    videoRef,
    streamRef,
    openCamera,
    closeCamera,
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
    hasPreview,
    captionRemaining,
    CAPTION_MAX,

    // Setters
    setAlt,
    setCaption,
  setSpotifyLink,
    setCaptionFocused,
    setVisibility,
    setPreviewLoaded,
    setEditing,
    setEditingIndex,
    setDataUrls,
    setOriginalDataUrls,
    setEditorSettings,
    setCompressedSize,
    setOriginalSize,
    setProcessing,
    setIndex,

    // Functions
    setDrag,
    resetDraft,
    removePhoto,
    handleFile,
    publish,
    handleFileInputChange,
  } = useUploader();

  return (
    <div className={`uploader view-fade ${hasPreview ? 'has-preview' : ''}`}>
  {editing && (dataUrls[editingIndex] || dataUrls[0]) && (
        <Portal className="upload-editor-fullscreen">
          <Suspense fallback={
            <div className="upload-editor-loading">
              <div className="card skeleton" style={{ height: 400, width: '100%', maxWidth: 600 }} />
            </div>
          }>
            <ImageEditor
              initialDataUrl={(originalDataUrls[editingIndex] || dataUrls[editingIndex] || originalDataUrls[0] || dataUrls[0]) as string}
              initialSettings={editorSettings[editingIndex] || {}}
              onCancel={() => {
                setEditing(false);
                sessionStorage.removeItem('monolog:upload_editor_open');
              }}
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
                  if (editingIndex === 0) { setPreviewLoaded(false); }
                  setCompressedSize(approxDataUrlBytes(compressed));
                  setOriginalSize(approxDataUrlBytes(newUrl));
                } catch (e) {
                  console.error(e);
                  setDataUrls(d => {
                    const copy = [...d];
                    copy[editingIndex] = newUrl as string;
                    return copy;
                  });
                  if (editingIndex === 0) { setPreviewLoaded(false); }
                  setCompressedSize(approxDataUrlBytes(newUrl as string));
                } finally {
                  setProcessing(false);
                  setEditing(false);
                  sessionStorage.removeItem('monolog:upload_editor_open');
                }
              }}
            />
          </Suspense>
        </Portal>
      )}

  {!dataUrls.length && (
        <DropZone
          processing={processing}
          onCameraSelect={async () => {
            try {
              await openCamera();
            } catch (e) {
              try { if (cameraInputRef.current) (cameraInputRef.current as HTMLInputElement).value = ""; } catch (_) {}
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

      {!editing && (
        <FileInputs
          fileInputRef={fileInputRef}
          cameraInputRef={cameraInputRef}
          onFileChange={handleFileInputChange}
          onCameraChange={async () => {
            const f = cameraInputRef.current?.files?.[0];
            if (!f) return;
            await handleFile(f);
            try { cameraInputRef.current!.value = ""; } catch (_) {}
          }}
        />
      )}

      {!editing && (
        <PreviewSection
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
          openCamera={openCamera}
        />
      )}

      {hasPreview && !editing ? (
        <div className="photo-action-row">
          <button
            type="button"
            className="btn icon ghost small-min"
            aria-label="Add photos"
            onClick={() => {
              if (dataUrls.length >= 5) {
                // Do nothing - button is already disabled
                return;
              }
              // ensure we're in append mode then open the file selector
              fileActionRef.current = 'append';
              try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (_) {}
              try { fileInputRef.current?.click(); } catch (_) {}
            }}
            disabled={processing || dataUrls.length >= 5}
            title={dataUrls.length >= 5 ? "Maximum 5 photos allowed" : "Add photos"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M12 5v14"/>
              <path d="M5 12h14"/>
            </svg>
          </button>
          <button
            className="btn icon ghost small-min"
            aria-label="Edit photo"
            onClick={() => { setEditingIndex(index); setEditing(true); }}
            disabled={processing}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            className="btn icon ghost small-min"
            aria-label="Remove photo"
            onClick={() => {
              if (processing) return;
              removePhoto(index);
            }}
            disabled={processing}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M3 6h18"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
      ) : null}

      <div style={{ marginTop: 8 }}>
        {compressedSize != null && compressedSize > CONFIG.imageMaxSizeMB * 1024 * 1024 ? (
          <div className="warn">Compressed image exceeds the maximum of {CONFIG.imageMaxSizeMB} MB. Please resize or choose a smaller file.</div>
        ) : null}
      </div>

      {!editing && (
        <CaptionInput
          caption={caption}
          setCaption={setCaption}
          spotifyLink={spotifyLink}
          setSpotifyLink={setSpotifyLink}
          captionFocused={captionFocused}
          setCaptionFocused={setCaptionFocused}
          hasPreview={hasPreview}
          processing={processing}
          CAPTION_MAX={CAPTION_MAX}
          toast={toast}
        />
      )}

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
    </div>
  );
}
