/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect } from "react";
import { api } from "@/src/lib/api";
import { AuthForm } from "./AuthForm";
import { compressImage, approxDataUrlBytes } from "@/src/lib/image";
import { CONFIG } from "@/src/lib/config";
import { useAuth } from "./uploader/useAuth";
import { useToast } from "./Toast";
import { DropZone } from "./uploader/DropZone";
import { FileInputs } from "./uploader/FileInputs";
import { PreviewSection } from "./uploader/PreviewSection";
import { CaptionInput } from "./uploader/CaptionInput";
import { PublishControls } from "./uploader/PublishControls";
import { useUploader } from "./uploader/useUploader";

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
  const {
    // State
    dataUrl,
    dataUrls,
    originalDataUrls,
    editorSettings,
    alt,
    caption,
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
    typed,
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
    setCaptionFocused,
    setVisibility,
    setPreviewLoaded,
    setEditing,
    setEditingIndex,
    setDataUrls,
    setOriginalDataUrls,
    setEditorSettings,
    setDataUrl,
    setCompressedSize,
    setOriginalSize,
    setProcessing,
    setIndex,

    // Functions
    setDrag,
    resetDraft,
    handleFile,
    publish,
    handleFileInputChange,
  } = useUploader();

  return (
    <div className={`uploader view-fade ${hasPreview ? 'has-preview' : ''}`}>

      {!dataUrl && !dataUrls.length && (
        <DropZone
          processing={processing}
          onFileSelect={() => {
            try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (_) {}
            fileInputRef.current?.click();
          }}
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
        openCamera={openCamera}
      />

      {/* Add photos button when preview exists to append more images */}
      {hasPreview && !editing ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              // ensure we're in append mode then open the file selector
              fileActionRef.current = 'append';
              try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (_) {}
              try { fileInputRef.current?.click(); } catch (_) {}
            }}
            disabled={processing}
          >
            Add photos
          </button>
        </div>
      ) : null}
      {hasPreview && !editing ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
          <div className="dim">You can add up to 5 photos per post</div>
        </div>
      ) : null}

      {hasPreview && !editing ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6, gap: 8 }}>
          <button
            className="btn ghost"
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
            className="btn ghost"
            aria-label="Replace photo"
            onClick={() => {
              if (processing) return;
              fileActionRef.current = 'replace';
              replaceIndexRef.current = index;
              setEditing(false);
              try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (_) {}
              try { fileInputRef.current?.click(); } catch (_) {}
            }}
            disabled={processing}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>
          <button
            type="button"
            className="btn ghost"
            aria-label="Capture photo"
            onClick={async () => {
              if (processing) return;
              fileActionRef.current = 'replace';
              replaceIndexRef.current = index;
              setEditing(false);
              try {
                await openCamera();
              } catch (e) {
                try { if (cameraInputRef.current) (cameraInputRef.current as HTMLInputElement).value = ""; } catch (_) {}
                try { cameraInputRef.current?.click(); } catch (_) {}
              }
            }}
            disabled={processing}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
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
          typed={typed}
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
      {/* Screen reader hint when in confirm state */}
      {confirmCancel ? (
        <div className="sr-only" role="status">Tap Cancel again to discard this draft.</div>
      ) : null}
    </div>
  );
}
