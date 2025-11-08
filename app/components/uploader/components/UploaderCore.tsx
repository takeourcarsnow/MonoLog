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

export function UploaderCore() {
  // Dev helper to trace focus events; no-op in production
  initFocusDebug();
  const { me, setMe } = useAuth();

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
  const [liveCameraOpen, setLiveCameraOpen] = useState(false);

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
    setLiveCameraOpen,
    handleFile,
  });

  const handleEditPhoto = async () => {
    setEditingIndex(index);
    try { await preloadOverlayThumbnails(); } catch {}
    setEditing(true);
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
      <AddPhotoMenu
        isOpen={showMenu}
        onClose={() => setShowAddPhotoMenu(false)}
        onAddFromCameraEffects={handleAddFromCameraEffects}
        onAddFromCamera={handleAddFromCamera}
        onAddFromFile={handleAddFromFile}
        processing={processing}
      />

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
          onCameraEffectsSelect={handleAddFromCameraEffects}
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