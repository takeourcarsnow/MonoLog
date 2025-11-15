"use client";

import { useCallback, useState, useEffect } from "react";

interface UseCaptureLogicProps {
  isCapturing: boolean;
  processing: boolean;
  onCapture: (blob: Blob) => void;
  effectSettings: any;
  sourceCanvasRef: React.RefObject<HTMLCanvasElement>;
  displayCanvasRef: React.RefObject<HTMLCanvasElement>;
  stopCamera: () => void;
  stopRenderLoop: () => void;
  performCapture: (isCapturing: boolean, processing: boolean, callback: (blob: Blob) => void, effectSettings: any, sourceCanvasRef: React.RefObject<HTMLCanvasElement>, displayCanvasRef: React.RefObject<HTMLCanvasElement>, stopCamera: () => void) => void;
  onClose: () => void;
  closeAfterCapture?: boolean;
}

export function useCaptureLogic({
  isCapturing,
  processing,
  onCapture,
  effectSettings,
  sourceCanvasRef,
  displayCanvasRef,
  stopCamera,
  stopRenderLoop,
  performCapture,
  onClose,
  closeAfterCapture = true,
}: UseCaptureLogicProps) {
  // Preview state for confirm/retake flow
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    // Revoke object URL when previewUrl changes/clears
    return () => {
      if (previewUrl) {
        try { URL.revokeObjectURL(previewUrl); } catch (e) {}
      }
    };
  }, [previewUrl]);

  // Handle capture - produce a preview first, allow confirm/retake
  const handleCapture = useCallback(() => {
    // Prevent multiple captures
    if (isCapturing || processing) return;

    // Stop the camera stream immediately to freeze the view
    stopCamera();

    // Stop the render loop to freeze the view
    stopRenderLoop();

    performCapture(
      isCapturing,
      processing,
      (blob) => {
        // Save preview and let user confirm or retake
        setPreviewBlob(blob);
        try {
          setPreviewUrl(URL.createObjectURL(blob));
        } catch (e) {
          setPreviewUrl(null);
        }
        setIsPreviewing(true);
      },
      effectSettings,
      sourceCanvasRef,
      displayCanvasRef,
      stopCamera
    );
  }, [isCapturing, processing, effectSettings, sourceCanvasRef, displayCanvasRef, stopCamera, stopRenderLoop, performCapture]);

  // Confirm the preview: call onCapture with the selected blob
  const confirmCapture = useCallback(() => {
    console.log('[confirmCapture] called, previewBlob:', !!previewBlob, previewBlob?.size, previewBlob?.type);
    if (!previewBlob) return;

    // If we have a display canvas available, the user may have applied
    // effects to the previewed image. In that case, export the display
    // canvas to a new Blob so the uploaded/saved image includes the
    // effects. Fall back to the original preview blob if export fails.
    const exportFromCanvas = async () => {
      try {
        const disp = displayCanvasRef?.current;
        if (disp && typeof disp.toBlob === 'function') {
          const mime = previewBlob.type || 'image/jpeg';
          const blob: Blob | null = await new Promise((resolve) => disp.toBlob(resolve, mime, 0.8));
          console.log('[confirmCapture] exported blob from canvas:', !!blob, blob?.size);
          if (blob) {
            onCapture(blob);
            return;
          }
        }
      } catch (e) {
        console.error('[confirmCapture] export from canvas failed:', e);
        // ignore and fall back
      }

      // Fallback: use original blob
      try {
        console.log('[confirmCapture] using fallback blob');
        onCapture(previewBlob);
      } catch (e) {
        console.error('Error during confirm capture:', e);
      }
    };

    // Run export and then clear preview and close
    exportFromCanvas().finally(() => {
      // clear preview
      setIsPreviewing(false);
      setPreviewBlob(null);
      if (previewUrl) {
        try { URL.revokeObjectURL(previewUrl); } catch (e) {}
        setPreviewUrl(null);
      }
      // Close the modal after confirming or retake for another capture
      if (closeAfterCapture) {
        onClose();
      } else {
        retakeCapture();
      }
    });
  }, [previewBlob, onCapture, previewUrl, onClose]);

  // Retake: clear preview; parent should restart camera/render
  const retakeCapture = useCallback(() => {
    setIsPreviewing(false);
    setPreviewBlob(null);
    if (previewUrl) {
      try { URL.revokeObjectURL(previewUrl); } catch (e) {}
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  return {
    handleCapture,
    previewBlob,
    previewUrl,
    isPreviewing,
    confirmCapture,
    retakeCapture,
    // Allow external callers to set a preview directly from a Blob (e.g. file input)
    // Stable callback to avoid creating a new function each render (prevents
    // useEffect dependency loops in components that consume this hook).
    setPreviewFromBlob: useCallback((blob: Blob | null) => {
      if (!blob) return;
      setPreviewBlob(blob);
      try {
        setPreviewUrl(URL.createObjectURL(blob));
      } catch (e) {
        setPreviewUrl(null);
      }
      setIsPreviewing(true);
    }, []),
  };
}