"use client";

import { useState } from "react";
import { preloadOverlayThumbnails } from '../../imageEditor/overlaysPreload';
import { useAuth } from "@/lib/hooks/useAuth";
import { CONFIG } from "@/lib/config";
import { DropZone } from "../DropZone";
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
import { usePhotoMovement } from "../hooks/usePhotoMovement";
import { useAddPhoto } from "../hooks/useAddPhoto";
import { AddPhotoMenu } from "./AddPhotoMenu";
import { useCameraContext } from "@/app/components/context/CameraContext";

export function UploaderCore() {
  // Dev helper to trace focus events; no-op in production
  initFocusDebug();
  const { me, setMe } = useAuth();
  const { setIsCameraOpen, setCaptureCallback, setInitialDataUrl, setIsEditing, setEditCallback } = useCameraContext();

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
    locationAddress,
    visibility,
    previewLoaded,
    editing,
    editingIndex,
    editingAlt,
    index,
    processing,
    publishing,
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
    extractedExif,
    hasPreview,
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
    setLocationAddress,
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

  // State for live camera with effects
  // const [liveCameraOpen, setLiveCameraOpen] = useState(false);

  const { handleMoveLeft, handleMoveRight } = usePhotoMovement({
    dataUrls,
    originalDataUrls,
    editorSettings,
    alt,
    index,
    setDataUrls,
    setOriginalDataUrls,
    setEditorSettings,
    setAlt,
    setIndex,
  });

  const {
    showAddPhotoMenu: showMenu,
    setShowAddPhotoMenu,
    handleAddPhotos,
    handleAddFromFile,
    handleAddFromCamera,
    handleAddFromCameraEffects,
    handleCameraCapture,
  } = useAddPhoto({
    dataUrls,
    processing,
    fileActionRef,
    fileInputRef,
    cameraInputRef,
    setIsCameraOpen,
    setCaptureCallback,
    handleFile,
  });

  // When editing we will now reuse LiveCameraView with initialDataUrl instead of ImageEditorModal
  const [editingInCamera, setEditingInCamera] = useState(false);
  const handleEditPhoto = async () => {
    // Capture the current index immediately to avoid relying on
    // state values that may not update synchronously. Use `target`
    // inside callbacks so the edited image always replaces the
    // intended photo instead of appending a new one.
    const target = index;
    setEditingIndex(target);
    try { await preloadOverlayThumbnails(); } catch {}

    // Use the global camera flow but provide an initialDataUrl so the
    // LiveCameraView loads the existing image into preview mode instead
    // of opening the live camera stream. We also provide an editCallback
    // which will receive the edited blob and apply it back into the
    // uploader state.
    try {
      setInitialDataUrl(dataUrls[target] ?? null);
      setIsEditing(true);
      const applyEdit = (blob: Blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          try { console.debug('[UploaderCore] applyEdit invoked for target', target, 'current dataUrls length', dataUrls.length); } catch (_) {}
          setDataUrls(d => {
            if (d.length > 0) {
              const copy = [...d];
              const safeAt = Math.max(0, Math.min(target, d.length - 1));
              copy[safeAt] = result;
              return copy;
            }
            return [result];
          });
          setOriginalDataUrls(d => {
            if (d.length > 0) {
              const copy = [...d];
              const safeAt = Math.max(0, Math.min(target, d.length - 1));
              copy[safeAt] = result;
              return copy;
            }
            return [result];
          });
          setEditorSettings(s => {
            if (s.length > 0) {
              const copy = [...s];
              const safeAt = Math.max(0, Math.min(target, s.length - 1));
              copy[safeAt] = {};
              return copy;
            }
            return [{}];
          });
          setEditingInCamera(false);
          try { setIsCameraOpen(false); setInitialDataUrl(null); setIsEditing(false); setEditCallback(null); setCaptureCallback(null); } catch (_) {}
          setEditing(false);
          try { (window as any).__MONOLOG_PENDING_EDIT__ = null; } catch (_) {}
        };
        try { reader.readAsDataURL(blob); } catch (_) {}
      };

      try { console.debug('[UploaderCore] setting edit/capture callbacks for target', target); } catch (_) {}
      setEditCallback(applyEdit);
      // Also set the capture callback so any code that uses the capture
      // callback (instead of editCallback) will still route the blob to
      // the uploader edit handler and avoid being queued/added as a new
      // photo.
      setCaptureCallback(applyEdit);
      try { (window as any).__MONOLOG_PENDING_EDIT__ = { target, ts: Date.now() }; } catch (_) {}
      
      setIsCameraOpen(true);
    } catch (_) {}
  };

  return (
    <div className={`uploader view-fade ${hasPreview ? 'has-preview' : ''} ${justDiscarded ? 'just-discarded' : ''} ${processing ? 'processing' : ''}`}>
      {/* Live camera with effects */}
      {/* <LiveCameraView
        isOpen={liveCameraOpen}
        onClose={() => setLiveCameraOpen(false)}
        onCapture={handleCameraCapture}
        processing={processing}
      /> */}

      {/* Add photo source selection */}
      <AddPhotoMenu
        isOpen={showMenu}
        onClose={() => setShowAddPhotoMenu(false)}
        onAddFromCameraEffects={handleAddFromCameraEffects}
        onAddFromCamera={handleAddFromCamera}
        onAddFromFile={handleAddFromFile}
        processing={processing}
      />

      {/* Legacy ImageEditorModal removed when using integrated LiveCameraView editing */}
      {!editingInCamera && (
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
        publishing={publishing}
        compressedSize={compressedSize}
        CONFIG={CONFIG}
        onPublish={() => publish()}
        confirmCancel={confirmCancel}
        setConfirmCancel={setConfirmCancel}
        confirmCancelTimerRef={confirmCancelTimerRef}
        resetDraft={resetDraft}
      />

      {/* Live camera view for adding new photos or editing existing (effects). */}
      <LiveCameraView
        isOpen={editingInCamera}
        // Open as a non-modal fullscreen view so the tabbar/header is
        // removed like the realtime camera experience.
        isModal={false}
        onClose={() => {
          // Ensure CameraContext is informed so global UI is restored
          try { setIsCameraOpen(false); setInitialDataUrl(null); setIsEditing(false); setEditCallback(null); } catch (_) {}
          setEditingInCamera(false);
          setEditing(false);
        }}
        onCapture={(blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            setDataUrls(d => {
              if (d.length > 0) {
                const copy = [...d];
                const at = editingIndex ?? index;
                const safeAt = Math.max(0, Math.min(at, d.length - 1));
                copy[safeAt] = result;
                return copy;
              } else {
                return [result];
              }
            });
            setOriginalDataUrls(d => {
              if (d.length > 0) {
                const copy = [...d];
                const at = editingIndex ?? index;
                const safeAt = Math.max(0, Math.min(at, d.length - 1));
                copy[safeAt] = result;
                return copy;
              } else {
                return [result];
              }
            });
            setEditorSettings(s => {
              if (s.length > 0) {
                const copy = [...s];
                const at = editingIndex ?? index;
                const safeAt = Math.max(0, Math.min(at, s.length - 1));
                copy[safeAt] = {};
                return copy;
              } else {
                return [{}];
              }
            });
            setEditingInCamera(false);
            try { setIsCameraOpen(false); setInitialDataUrl(null); setIsEditing(false); setEditCallback(null); } catch (_) {}
            setEditing(false);
          };
          try { reader.readAsDataURL(blob); } catch {}
        }}
        processing={processing}
        initialDataUrl={dataUrls[editingIndex ?? index]}
      />

      {!dataUrls.length && !editingInCamera && (
        <DropZone
          processing={processing}
          onCameraEffectsSelect={handleAddFromCameraEffects}
          onFileSelect={() => fileInputRef.current?.click()}
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

      {!editing && !editingInCamera && (
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

      {!editing && !editingInCamera && (
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
          publishing={publishing}
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
        editing={editing || editingInCamera}
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

      {!editing && !editingInCamera && (
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
          locationAddress={locationAddress}
          setLocationAddress={setLocationAddress}
          extractedExif={extractedExif}
          hasPreview={hasPreview}
          processing={processing}
          toast={toast}
          user={me}
          setUser={setMe}
        />
      )}
    </div>
  );
}