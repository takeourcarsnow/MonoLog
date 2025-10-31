"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./useAuth";
import { useDraftPersistence } from "./useDraftPersistence";
import { useCountdown } from "./useCountdown";
import { useFileHandling } from "./useFileHandling";
import { useToast } from "../Toast";
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
  const toast = useToast();

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
    confirmCancel,
    justDiscarded,
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
    setWeatherLocation,
    setLocationLatitude,
    setLocationLongitude,
    setLocationAddress,
    setCaptionFocused,
    setVisibility,
    setPreviewLoaded,
    setEditing,
    setEditingIndex,
    setEditingAlt,
    setIndex,
    setProcessing,
    setCompressedSize,
    setConfirmCancel,
    setJustDiscarded,
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
    spotifyLink, setSpotifyLink,
    camera, setCamera,
    lens, setLens,
    filmType, setFilmType,
    filmIso, setFilmIso
    ,
    weatherCondition, setWeatherCondition,
    weatherTemperature, setWeatherTemperature,
    weatherLocation, setWeatherLocation,
    locationLatitude, setLocationLatitude,
    locationLongitude, setLocationLongitude,
    locationAddress, setLocationAddress
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
    setWeatherLocation,
    setLocationLatitude,
    setLocationLongitude,
    setLocationAddress,
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
    weatherLocation,
    locationLatitude,
    locationLongitude,
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

  const captionRemaining = Math.max(0, CAPTION_MAX - (caption?.length || 0));

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
    hasPreview,
    captionRemaining,
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
  setWeatherLocation,
  setLocationLatitude,
  setLocationLongitude,
  setLocationAddress,
    setCaptionFocused,
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
