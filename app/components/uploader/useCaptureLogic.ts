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
    if (!previewBlob) return;
    onCapture(previewBlob);
    // clear preview
    setIsPreviewing(false);
    setPreviewBlob(null);
    if (previewUrl) {
      try { URL.revokeObjectURL(previewUrl); } catch (e) {}
      setPreviewUrl(null);
    }
  }, [previewBlob, onCapture, previewUrl]);

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
  };
}