"use client";
import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./useAuth";
import { useCameraContext } from "@/app/components/context/CameraContext";
import { useDraftPersistence } from "./useDraftPersistence";
import { compressImage, approxDataUrlBytes } from '@/lib/image';
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

  // Camera context callbacks — used to route queued blobs to edit/capture
  // handlers if the uploader opened the camera for editing.
  const { editCallback, captureCallback } = useCameraContext();

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
  const { handleFile, handleFileInputChange, handleMultipleFiles } = createFileHandlers(
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

  // Consume any captured blobs that were queued while the camera UI was
  // open. We process them on mount so the uploader (which may have been
  // unmounted while the camera was open) can receive the captured images.
  React.useEffect(() => {
    const q = (window as any).__MONOLOG_CAPTURE_QUEUE__;
    if (!q || !q.length) return;

    let mounted = true;

    (async () => {
      try {
        // Drain the queue synchronously to avoid duplicate processing
        try { console.debug('[useUploader] draining capture queue length', q.length); } catch (_) {}
        (window as any).__MONOLOG_CAPTURE_QUEUE__ = [];
        for (const item of q) {
          if (!mounted) break;
          try {
            let blob: Blob = item as Blob;
            let pendingTarget: number | null = null;
            // support queued items that may include pendingTarget metadata
            if (item && typeof item === 'object' && ('blob' in item)) {
              // @ts-ignore
              blob = item.blob as Blob;
              // @ts-ignore
              pendingTarget = item.pendingTarget ?? null;
            }
            try { console.debug('[useUploader] processing queued blob', { pendingTarget, blob }); } catch (_) {}
            // If an edit or capture callback is currently set on the global
            // CameraContext, prefer invoking it so the blob is treated as an
            // edit (replace) rather than being appended as a new photo.
            // If an edit/capture callback is currently present on the
            // camera context (set when the uploader opened the camera for
            // editing) prefer invoking it so the queued blob is treated as
            // an edit (replace) instead of being appended as a new photo.
            const cb = editCallback || captureCallback;
            if (cb) {
              try { console.debug('[useUploader] routing queued blob to camera callback'); } catch (_) {}
              try { cb(blob as Blob); } catch (e) { console.error('Camera callback failed', e); }
              continue; // move to next queued blob
            }

            // If a pending-edit marker exists on window (set as a fallback
            // when the uploader opened the camera for editing), invoke its
            // handler and clear the marker so the blob is treated as an
            // edit rather than a new upload.
            try {
              const pending = (window as any).__MONOLOG_PENDING_EDIT__;
              if (pending && typeof pending.handler === 'function') {
                try { console.debug('[useUploader] routing queued blob to pending-edit handler'); } catch (_) {}
                try { pending.handler(blob as Blob); } catch (e) { console.error('Pending edit handler failed', e); }
                try { (window as any).__MONOLOG_PENDING_EDIT__ = null; } catch (_) {}
                continue;
              }
            } catch (_) {}

            // If this queued item is marked as a pending edit, apply it as a
            // replacement at the requested index rather than appending.
            if (typeof pendingTarget === 'number') {
              try {
                const file = new File([blob], 'camera-capture.jpg', { type: (blob as Blob).type || 'image/jpeg' });
                try {
                  const url = await compressImage(file);
                  try { setCompressedSize(approxDataUrlBytes(url)); } catch (_) {}
                  setDataUrls(d => {
                    if (d.length) {
                      const safeReplaceAt = Math.min(pendingTarget as number, d.length - 1);
                      const copy = [...d];
                      copy[safeReplaceAt] = url;
                      if (safeReplaceAt === 0) { try { setPreviewLoaded(false); } catch (_) {} }
                      return copy;
                    }
                    try { setPreviewLoaded(false); } catch (_) {}
                    return [url];
                  });
                  setOriginalDataUrls(d => {
                    if (d.length) {
                      const safeReplaceAt = Math.min(pendingTarget as number, d.length - 1);
                      const copy = [...d];
                      copy[safeReplaceAt] = url;
                      return copy;
                    }
                    return [url];
                  });
                  setEditorSettings(s => {
                    if (s.length) {
                      const safeReplaceAt = Math.min(pendingTarget as number, s.length - 1);
                      const copy = [...s];
                      copy[safeReplaceAt] = {};
                      return copy;
                    }
                    return [{}];
                  });
                  try { setOriginalSize(file.size); } catch (_) {}
                } catch (e) {
                  console.error('Failed to compress queued edit blob, falling back', e);
                  // Fallback: create object URL and set as replacement
                  try {
                    const url = URL.createObjectURL(blob as Blob);
                    setDataUrls(d => {
                      if (d.length) {
                        const safeReplaceAt = Math.min(pendingTarget as number, d.length - 1);
                        const copy = [...d];
                        copy[safeReplaceAt] = url as unknown as string;
                        if (safeReplaceAt === 0) { try { setPreviewLoaded(false); } catch (_) {} }
                        return copy;
                      }
                      try { setPreviewLoaded(false); } catch (_) {}
                      return [url as unknown as string];
                    });
                    setOriginalDataUrls(d => {
                      if (d.length) {
                        const safeReplaceAt = Math.min(pendingTarget as number, d.length - 1);
                        const copy = [...d];
                        copy[safeReplaceAt] = url as unknown as string;
                        return copy;
                      }
                      return [url as unknown as string];
                    });
                    setEditorSettings(s => {
                      if (s.length) {
                        const safeReplaceAt = Math.min(pendingTarget as number, s.length - 1);
                        const copy = [...s];
                        copy[safeReplaceAt] = {};
                        return copy;
                      }
                      return [{}];
                    });
                    try { setOriginalSize((blob as Blob).size); } catch (_) {}
                  } catch (e2) {
                    console.error('Fallback replacement failed', e2);
                  }
                }
                // Clear any pending marker
                try { (window as any).__MONOLOG_PENDING_EDIT__ = null; } catch (_) {}
                continue;
              } catch (e) {
                console.error('Failed to apply queued edit', e);
              }
            }

            const file = new File([blob], 'camera-capture.jpg', { type: (blob as Blob).type || 'image/jpeg' });
            // Reuse the same handleFile logic to process and add to uploader
            await handleFile(file);
          } catch (e) {
            console.error('Failed to process queued captured blob', e);
          }
        }
      } catch (e) {
        console.error('Error draining camera capture queue', e);
      }
    })();

    return () => { mounted = false; };
  }, [handleFile, editCallback, captureCallback]);

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
    handleMultipleFiles,
    publish,
    handleFileInputChange,
  };
}
