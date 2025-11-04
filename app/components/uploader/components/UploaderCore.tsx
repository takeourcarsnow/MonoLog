"use client";

import { useEffect, useState } from "react";
import { preloadOverlayThumbnails } from '../../imageEditor/overlaysPreload';
import { useAuth } from "@/src/lib/hooks/useAuth";
import { CONFIG } from "@/src/lib/config";
import { DropZone } from "../DropZone";
import Portal from "../../Portal";
import { FileInputs } from "../FileInputs";
import { PreviewSection } from "../PreviewSection";
import { CaptionInput } from "../CaptionInput";
import { PublishControls } from "../PublishControls";
import { useUploader } from "../useUploader";
import { initFocusDebug } from "../focusDebug";
import { ImageEditorModal } from "./ImageEditorModal";
import { PhotoActionRow } from "./PhotoActionRow";
import { SizeWarning } from "./SizeWarning";
import { LiveCameraView } from "../LiveCameraView";

export function UploaderCore() {
  // Dev helper to trace focus events; no-op in production
  initFocusDebug();
  const { me, setMe } = useAuth();

  // State for live camera with effects
  const [liveCameraOpen, setLiveCameraOpen] = useState(false);
  const [showAddPhotoMenu, setShowAddPhotoMenu] = useState(false);

  const {
    // State
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
    weatherCondition,
    weatherTemperature,
    weatherLocation,
    locationLatitude,
    locationLongitude,
    locationAddress,
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
    setAlt,
    setCaption,
    setSpotifyLink,
    setCamera,
    setLens,
    setFilmType,
    setFilmIso,
    setWeatherCondition,
    setWeatherTemperature,
    setWeatherLocation,
    setLocationLatitude,
    setLocationLongitude,
    setLocationAddress,
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

  const handleMoveLeft = () => {
    if (index === 0) return;
    const newIndex = index - 1;
    // Swap dataUrls
    const newDataUrls = [...dataUrls];
    [newDataUrls[index], newDataUrls[newIndex]] = [newDataUrls[newIndex], newDataUrls[index]];
    setDataUrls(newDataUrls);
    // Swap originalDataUrls
    const newOriginalDataUrls = [...originalDataUrls];
    [newOriginalDataUrls[index], newOriginalDataUrls[newIndex]] = [newOriginalDataUrls[newIndex], newOriginalDataUrls[index]];
    setOriginalDataUrls(newOriginalDataUrls);
    // Swap editorSettings
    const newEditorSettings = [...editorSettings];
    [newEditorSettings[index], newEditorSettings[newIndex]] = [newEditorSettings[newIndex], newEditorSettings[index]];
    setEditorSettings(newEditorSettings);
    // Swap alt if it's an array
    if (Array.isArray(alt)) {
      const newAlt = [...alt];
      [newAlt[index], newAlt[newIndex]] = [newAlt[newIndex], newAlt[index]];
      setAlt(newAlt);
    }
    setIndex(newIndex);
  };

  const handleMoveRight = () => {
    if (index === dataUrls.length - 1) return;
    const newIndex = index + 1;
    // Swap dataUrls
    const newDataUrls = [...dataUrls];
    [newDataUrls[index], newDataUrls[newIndex]] = [newDataUrls[newIndex], newDataUrls[index]];
    setDataUrls(newDataUrls);
    // Swap originalDataUrls
    const newOriginalDataUrls = [...originalDataUrls];
    [newOriginalDataUrls[index], newOriginalDataUrls[newIndex]] = [newOriginalDataUrls[newIndex], newOriginalDataUrls[index]];
    setOriginalDataUrls(newOriginalDataUrls);
    // Swap editorSettings
    const newEditorSettings = [...editorSettings];
    [newEditorSettings[index], newEditorSettings[newIndex]] = [newEditorSettings[newIndex], newEditorSettings[index]];
    setEditorSettings(newEditorSettings);
    // Swap alt if it's an array
    if (Array.isArray(alt)) {
      const newAlt = [...alt];
      [newAlt[index], newAlt[newIndex]] = [newAlt[newIndex], newAlt[index]];
      setAlt(newAlt);
    }
    setIndex(newIndex);
  };

  const handleEditPhoto = async () => {
    setEditingIndex(index);
    try { await preloadOverlayThumbnails(); } catch {}
    setEditing(true);
  };

  const handleAddPhotos = () => {
    if (dataUrls.length >= 5) {
      return;
    }
    setShowAddPhotoMenu(true);
  };

  const handleAddFromFile = () => {
    setShowAddPhotoMenu(false);
    fileActionRef.current = 'append';
    try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (_) {}
    try { fileInputRef.current?.click(); } catch (_) {}
  };

  const handleAddFromCamera = () => {
    setShowAddPhotoMenu(false);
    fileActionRef.current = 'append';
    try { if (cameraInputRef.current) (cameraInputRef.current as HTMLInputElement).value = ""; } catch (_) {}
    try { cameraInputRef.current?.click(); } catch (_) {}
  };

  const handleAddFromCameraEffects = () => {
    setShowAddPhotoMenu(false);
    if (navigator.mediaDevices) {
      setLiveCameraOpen(true);
    } else {
      // Fallback to file input if getUserMedia not available
      fileActionRef.current = 'append';
      try { if (cameraInputRef.current) (cameraInputRef.current as HTMLInputElement).value = ""; } catch (_) {}
      try { cameraInputRef.current?.click(); } catch (_) {}
    }
  };

  // Handle camera capture from live camera view
  const handleCameraCapture = async (blob: Blob) => {
    // Keep modal open during processing - it will show loading state
    // Directly create File from Blob (no fetch of data URLs)
    const file = new File([blob], 'camera-capture.jpg', { type: blob.type || 'image/jpeg' });

    await handleFile(file);
    
    // Close modal after processing is complete
    setLiveCameraOpen(false);
  };

  return (
    <div className={`uploader view-fade ${hasPreview ? 'has-preview' : ''} ${justDiscarded ? 'just-discarded' : ''} ${processing ? 'processing' : ''}`}>
      {/* Live camera with effects */}
      <LiveCameraView
        isOpen={liveCameraOpen}
        onClose={() => setLiveCameraOpen(false)}
        onCapture={handleCameraCapture}
        processing={processing}
      />

      {/* Add photo source selection */}
      {showAddPhotoMenu && (
        <Portal>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 12,
              zIndex: 20,
              background: 'rgba(0,0,0,0.85)',
            }}
            onClick={() => setShowAddPhotoMenu(false)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 400,
                background: 'var(--bg)',
                borderRadius: 8,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, textAlign: 'center' }}>Add Photo</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={handleAddFromCameraEffects}
                  disabled={processing}
                  style={{ width: '100%', justifyContent: 'flex-start', gap: 12 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 7h3l2-2h6l2 2h3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 3l2 2m0 0l-2 2m2-2h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Camera with Effects</span>
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleAddFromCamera}
                  disabled={processing}
                  style={{ width: '100%', justifyContent: 'flex-start', gap: 12 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 7h3l2-2h6l2 2h3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Quick Camera</span>
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleAddFromFile}
                  disabled={processing}
                  style={{ width: '100%', justifyContent: 'flex-start', gap: 12 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <span>Choose from Device</span>
                </button>
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setShowAddPhotoMenu(false)}
                style={{ width: '100%', marginTop: 4 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Portal>
      )}

      <ImageEditorModal
        editing={editing}
        editingIndex={editingIndex}
        dataUrls={dataUrls}
        originalDataUrls={originalDataUrls}
        editorSettings={editorSettings}
        editingAlt={editingAlt}
        onCancel={() => {
          setEditing(false);
          sessionStorage.removeItem('monolog:upload_editor_open');
        }}
        onApply={() => {
          setEditing(false);
          sessionStorage.removeItem('monolog:upload_editor_open');
        }}
        setAlt={setAlt}
        setEditorSettings={setEditorSettings}
        setDataUrls={setDataUrls}
        setPreviewLoaded={setPreviewLoaded}
        setCompressedSize={setCompressedSize}
        setOriginalSize={setOriginalSize}
        setProcessing={setProcessing}
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
        onPublish={() => publish()}
        confirmCancel={confirmCancel}
        setConfirmCancel={setConfirmCancel}
        confirmCancelTimerRef={confirmCancelTimerRef}
        resetDraft={resetDraft}
      />

      {!dataUrls.length && (
        <DropZone
          processing={processing}
          onCameraSelect={() => {
            // Direct camera access (no effects) - use traditional file input
            fileActionRef.current = 'append';
            try { if (cameraInputRef.current) (cameraInputRef.current as HTMLInputElement).value = ""; } catch (_) {}
            try { cameraInputRef.current?.click(); } catch (_) {}
          }}
          onCameraEffectsSelect={() => {
            // Live camera with effects modal
            if (navigator.mediaDevices) {
              setLiveCameraOpen(true);
            } else {
              // Fallback to file input if getUserMedia not available
              fileActionRef.current = 'append';
              try { if (cameraInputRef.current) (cameraInputRef.current as HTMLInputElement).value = ""; } catch (_) {}
              try { cameraInputRef.current?.click(); } catch (_) {}
            }
          }}
          onFileSelect={() => {
            fileActionRef.current = 'append';
            try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (_) {}
            try { fileInputRef.current?.click(); } catch (_) {}
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
          fileActionRef={fileActionRef}
          replaceIndexRef={replaceIndexRef}
          fileInputRef={fileInputRef}
          cameraInputRef={cameraInputRef}
          toast={toast}
          handleFile={handleFile}
        />
      )}

      <PhotoActionRow
        hasPreview={hasPreview}
        editing={editing}
        processing={processing}
        dataUrls={dataUrls}
        originalDataUrls={originalDataUrls}
        editorSettings={editorSettings}
        index={index}
        fileActionRef={fileActionRef}
        fileInputRef={fileInputRef}
        onEdit={handleEditPhoto}
        onRemove={removePhoto}
        onAddPhotos={handleAddPhotos}
        onMoveLeft={handleMoveLeft}
        onMoveRight={handleMoveRight}
      />

      <SizeWarning compressedSize={compressedSize} />

      {!editing && (
        <CaptionInput
          caption={caption}
          setCaption={setCaption}
          spotifyLink={spotifyLink}
          setSpotifyLink={setSpotifyLink}
          camera={camera}
          setCamera={setCamera}
          lens={lens}
          setLens={setLens}
          filmType={filmType}
          setFilmType={setFilmType}
          filmIso={filmIso}
          setFilmIso={setFilmIso}
          weatherCondition={weatherCondition}
          setWeatherCondition={setWeatherCondition}
          weatherTemperature={weatherTemperature}
          setWeatherTemperature={setWeatherTemperature}
          weatherLocation={weatherLocation}
          setWeatherLocation={setWeatherLocation}
          locationLatitude={locationLatitude}
          setLocationLatitude={setLocationLatitude}
          locationLongitude={locationLongitude}
          setLocationLongitude={setLocationLongitude}
          locationAddress={locationAddress}
          setLocationAddress={setLocationAddress}
          captionFocused={captionFocused}
          setCaptionFocused={setCaptionFocused}
          hasPreview={hasPreview}
          processing={processing}
          CAPTION_MAX={CAPTION_MAX}
          toast={toast}
          user={me}
          setUser={setMe}
        />
      )}
    </div>
  );
}