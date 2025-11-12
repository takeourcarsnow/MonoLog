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
  const { setIsCameraOpen, setCaptureCallback } = useCameraContext();

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
    setEditingIndex(index);
    try { await preloadOverlayThumbnails(); } catch {}
    // Switch to live camera view editing with effects instead of legacy editor modal
    // Ensure uploader is not in a processing state so the live camera can start
    try { setProcessing(false); } catch (_) {}
    try { setPreviewLoaded(false); } catch (_) {}
    setEditingInCamera(true);
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
        onClose={() => {
          setEditingInCamera(false);
          setEditing(false);
        }}
        onCapture={(blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            setDataUrls(d => {
              const at = editingIndex ?? index;
              if (d.length && at >= 0 && at < d.length) {
                const copy = [...d];
                copy[at] = result;
                return copy;
              }
              return [...d, result].slice(0,5);
            });
            setOriginalDataUrls(d => {
              const at = editingIndex ?? index;
              if (d.length && at >= 0 && at < d.length) {
                const copy = [...d];
                copy[at] = result;
                return copy;
              }
              return [...d, result].slice(0,5);
            });
            setEditorSettings(s => {
              const at = editingIndex ?? index;
              if (s.length && at >= 0 && at < s.length) {
                const copy = [...s];
                copy[at] = {};
                return copy;
              }
              return [...s, {}].slice(0,5);
            });
            setEditingInCamera(false);
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