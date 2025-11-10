"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./useAuth";
import { useDraftPersistence } from "./useDraftPersistence";
import { useCountdown } from "./useCountdown";
import { useFileHandling } from "./useFileHandling";
import { EDITING_SESSION_KEY, DRAFT_KEY } from "./constants";
import { EditorSettings } from "../imageEditor/types";
import { useUploaderState } from "./uploaderState";
import { useUploaderRefs } from "./uploaderRefs";
import { createFileHandlers } from "./uploaderFileLogic";
import { createDraftHandlers } from "./uploaderDraftLogic";
import { createPublishHandler } from "./uploaderPublishLogic";
import { useUploaderEffects } from "./uploaderEffects";

export function useUploader() {
  const pathname = usePathname();
  const router = useRouter();
  // Local no-op logger to satisfy downstream function signatures
  const toast = { show: (_: unknown) => {} } as const;

  // State
  const state = useUploaderState();
  const {
    CAPTION_MAX,
    originalSize,
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
    confirmCancel,
    justDiscarded,
    extractedExif,
    setOriginalSize,
    setDataUrls,
    setOriginalDataUrls,
    setEditorSettings,
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
    setEditingAlt,
    setIndex,
    setProcessing,
    setPublishing,
    setCompressedSize,
    setConfirmCancel,
    setJustDiscarded,
    setExtractedExif,
    setAltForDraft,
  } = state;

  // Refs
  const refs = useUploaderRefs();
  const {
    dropRef,
    fileInputRef,
    cameraInputRef,
    fileActionRef,
    replaceIndexRef,
    trackRef,
    touchStartX,
    touchDeltaX,
    confirmCancelTimerRef,
    attemptedEditorRestoreRef,
  } = refs;

  // Countdown
  const { canPost, nextAllowedAt, remaining, remainingMs, countdownTotalMs } = useCountdown();

  // File handling
  const { handleFile: handleFileProcessing } = useFileHandling();

  // Draft persistence
  useDraftPersistence(
    dataUrls, setDataUrls,
    originalDataUrls, setOriginalDataUrls,
    editorSettings, setEditorSettings,
    caption, setCaption,
    alt, setAltForDraft,
    visibility, setVisibility,
    compressedSize, setCompressedSize,
    originalSize, setOriginalSize,
    index, setIndex,
    spotifyLink, setSpotifyLink
  );

  // File handlers
  const { handleFile, handleFileInputChange } = createFileHandlers(
    toast,
    setProcessing,
    setPreviewLoaded,
    setOriginalSize,
    setCompressedSize,
    setDataUrls,
    setOriginalDataUrls,
    setEditorSettings,
    setIndex,
    setEditing,
    setAlt,
    setCamera,
    setLens,
    setExtractedExif,
    fileInputRef,
    dataUrls,
    alt,
    caption,
    fileActionRef,
    replaceIndexRef,
    index
  );

  // Draft handlers
  const { resetDraft, removePhoto } = createDraftHandlers(
    setJustDiscarded,
    setDataUrls,
    setOriginalDataUrls,
    setEditorSettings,
    setCaption,
    setSpotifyLink,
    setCamera,
    setLens,
    setFilmType,
    setFilmIso,
    setWeatherCondition,
    setWeatherTemperature,
    setLocationAddress,
    setExtractedExif,
    setAlt,
    setVisibility,
    setCompressedSize,
    setOriginalSize,
    setIndex,
    setPreviewLoaded,
    setEditing,
    fileInputRef,
    cameraInputRef,
    dataUrls,
    alt,
    originalDataUrls,
    editorSettings,
    index
  );

  // Publish handler
  const { publish } = createPublishHandler(
    toast,
    setProcessing,
    setPublishing,
    resetDraft,
    router,
    dataUrls,
    caption,
    alt,
    visibility,
    compressedSize,
    spotifyLink,
    camera,
    lens,
    filmType,
    filmIso,
    weatherCondition,
    weatherTemperature,
    locationAddress
  );

  // Effects
  const hasPreview = Boolean(dataUrls.length);
  useUploaderEffects(
    pathname,
    editing,
    editingAlt,
    editingIndex,
    setProcessing,
    setEditing,
    setEditingIndex,
    setEditingAlt,
    setIndex,
    setJustDiscarded,
    dataUrls,
    alt,
    canPost,
    hasPreview,
    attemptedEditorRestoreRef,
    index
  );

  const setDrag = (on: boolean) => {
    dropRef.current?.classList.toggle("dragover", on);
  };

  return {
  // State
  originalSize,
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
    nextAllowedAt,
    remaining,
    remainingMs,
    countdownTotalMs,
  // placeholder, typed removed - handled inside CaptionInput
    handleFileProcessing,
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
  setOriginalSize,
    setDataUrls,
    setOriginalDataUrls,
    setEditorSettings,
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
    setEditingAlt,
    setIndex,
    setProcessing,
    setCompressedSize,

    // Functions
    setDrag,
    resetDraft,
    removePhoto,
    handleFile,
    publish,
    handleFileInputChange,
  };
}
