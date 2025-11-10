"use client";

import { useCallback, useRef } from "react";
import { getFrameFiles } from "@/app/components/imageEditor/framesPreload";
import { getOverlayFiles } from "@/app/components/imageEditor/overlaysPreload";
import { CameraEffectSettings } from "./cameraEffects";

interface UseCameraHandlersProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  stopCamera: () => void;
  stopRenderLoop: () => void;
  setError: (error: string | null) => void;
  setCameraReady: (ready: boolean) => void;
  setShowProcessingOverlay: (show: boolean) => void;
  setIsCapturing: (capturing: boolean) => void;
  setFrameFiles: (files: string[]) => void;
  setOverlayFiles: (files: string[]) => void;
  setSelectedFrame: (frame: string | null) => void;
  setSelectedOverlay: (overlay: string | null) => void;
  setEffectSettings: React.Dispatch<React.SetStateAction<CameraEffectSettings>>;
  selectedFrame: string | null;
  selectedOverlay: string | null;
  effectSettings: CameraEffectSettings;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startCamera: () => Promise<void>;
  // Optional callback to set a preview directly (used when selecting a file from disk
  // so the app can present the same preview/confirm UI as a captured photo)
  setPreviewFromBlob?: (blob: Blob | null) => void;
}

export function useCameraHandlers({
  onCapture,
  onClose,
  stopCamera,
  stopRenderLoop,
  setError,
  setCameraReady,
  setShowProcessingOverlay,
  setIsCapturing,
  setFrameFiles,
  setOverlayFiles,
  setSelectedFrame,
  setSelectedOverlay,
  setEffectSettings,
  selectedFrame,
  selectedOverlay,
  effectSettings,
  videoRef,
  startCamera,
  setPreviewFromBlob,
}: UseCameraHandlersProps) {
  // File input ref for adding image from files
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    if (!f.type.startsWith('image/')) {
      // Not an image — ignore
      console.warn('Selected file is not an image');
      return;
    }

    // Stop camera and render loop so the view is frozen for editing/preview
    stopCamera();
    stopRenderLoop();

    // If the caller provided a preview setter, use that to show the
    // confirm/retake UI (do NOT upload immediately). Otherwise fall
    // back to the old behavior of passing the file to onCapture.
    if (setPreviewFromBlob) {
      try {
        setPreviewFromBlob(f);
      } catch (err) {
        console.error('Error setting preview from file:', err);
        // Fallback to immediate capture if previewing fails
        try { onCapture(f); onClose(); } catch (e) { console.error(e); }
      }
      return;
    }

    // No preview path available — behave like before and upload immediately
    setShowProcessingOverlay(true);
    try {
      onCapture(f);
    } catch (err) {
      console.error('Error handling file capture:', err);
    }
    onClose();
  }, [onCapture, onClose, stopCamera, stopRenderLoop, setShowProcessingOverlay]);

  // Enhanced camera start with better error handling
  const startCameraEnhanced = useCallback(async () => {
    try {
      setError(null);
      // Start camera stream. We mark `cameraReady` only once the video
      // element has emitted loadeddata/playing to avoid starting the
      // render loop before frames are available (this caused the UI to
      // remain blank until a zoom change forced a rerender).
      await startCamera();

      setCameraReady(false);

      const video = videoRef.current;
      let settled = false;
      const onReady = () => {
        if (settled) return;
        settled = true;
        setCameraReady(true);
        if (video) {
          video.removeEventListener('loadeddata', onReady);
          video.removeEventListener('playing', onReady);
        }
      };

      if (video) {
        // If already have enough data, mark ready synchronously
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          onReady();
        } else {
          video.addEventListener('loadeddata', onReady, { once: true } as any);
          video.addEventListener('playing', onReady, { once: true } as any);
          // Fallback timeout: if the events don't fire within 1s, assume ready
          setTimeout(() => onReady(), 1000);
        }
      } else {
        // No video element available — mark ready to avoid locking UI
        setCameraReady(true);
      }
    } catch (error: any) {
      let errorMessage = 'Failed to access camera.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application. Please close other apps using the camera.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not support the required settings. Trying with basic settings...';
        // Fallback to basic constraints
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = basicStream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
            };
          }
          setCameraReady(true);
          return;
        } catch (fallbackError) {
          errorMessage = 'Unable to access camera with any settings.';
        }
      }
      
      setError(errorMessage);
      console.error('Camera error:', error);
      // Don't auto-close, let user try again or close manually
    }
  }, [startCamera, videoRef, setError, setCameraReady]);

  // Handle close
  const handleClose = useCallback(() => {
    stopCamera();
    stopRenderLoop();
    setIsCapturing(false);
    setShowProcessingOverlay(false);
    onClose();
  }, [stopCamera, stopRenderLoop, onClose, setIsCapturing, setShowProcessingOverlay]);

  // Handle frame selection
  const handleSelectFrame = useCallback((file: string) => {
    const url = `/frames/${file}`;
    if (selectedFrame === file) {
      // Toggle off
      setSelectedFrame(null);
      setEffectSettings((prev: CameraEffectSettings) => ({ ...prev, frameOverlay: null }));
      return;
    }

    setSelectedFrame(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      // Compute bounds using the same logic as cameraEffects.ts
      const frameW = img.naturalWidth || img.width;
      const frameH = img.naturalHeight || img.height;

      const frameTemp = document.createElement('canvas');
      frameTemp.width = frameW;
      frameTemp.height = frameH;
      const fctx = frameTemp.getContext('2d')!;
      fctx.drawImage(img, 0, 0);
      const frameData = fctx.getImageData(0, 0, frameW, frameH);
      const data = frameData.data;

      const ALPHA_THRESHOLD = 16;
      const visited = new Uint8Array(frameW * frameH);
      const stack: number[] = [];

      // Start flood fill from borders
      for (let x = 0; x < frameW; x++) {
        stack.push(x, 0);
        stack.push(x, frameH - 1);
      }
      for (let y = 1; y < frameH - 1; y++) {
        stack.push(0, y);
        stack.push(frameW - 1, y);
      }

      while (stack.length > 0) {
        const y = stack.pop()!;
        const x = stack.pop()!;
        if (x < 0 || x >= frameW || y < 0 || y >= frameH) continue;
        const idx = y * frameW + x;
        if (visited[idx]) continue;
        const alpha = data[(idx * 4) + 3];
        if (alpha <= ALPHA_THRESHOLD) {
          visited[idx] = 1;
          if (x > 0) stack.push(x - 1, y);
          if (x < frameW - 1) stack.push(x + 1, y);
          if (y > 0) stack.push(x, y - 1);
          if (y < frameH - 1) stack.push(x, y + 1);
        }
      }

      let minX = frameW, minY = frameH, maxX = -1, maxY = -1;
      for (let y = 0; y < frameH; y++) {
        for (let x = 0; x < frameW; x++) {
          const idx = y * frameW + x;
          const alpha = data[(idx * 4) + 3];
          const isOutside = visited[idx] === 1;
          if (alpha === 0 && !isOutside) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      const bounds = { minX, minY, maxX, maxY };
      console.log('[Frame Selection] Computed bounds:', bounds);

      setEffectSettings((prev: CameraEffectSettings) => ({
        ...prev,
        frameOverlay: { img, opacity: 1, bounds }
      }));
    };
  }, [selectedFrame, setSelectedFrame, setEffectSettings]);

  // Handle overlay selection
  const handleSelectOverlay = useCallback((file: string) => {
    const url = `/overlays/${file}`;
    if (selectedOverlay === file) {
      // Toggle off
      setSelectedOverlay(null);
      setEffectSettings((prev: CameraEffectSettings) => ({ ...prev, overlay: null }));
      return;
    }

    setSelectedOverlay(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      setEffectSettings((prev: CameraEffectSettings) => ({
        ...prev,
        overlay: { img, blendMode: 'screen', opacity: 0.85 }
      }));
    };
  }, [selectedOverlay, setSelectedOverlay, setEffectSettings]);

  return {
    fileInputRef,
    openFilePicker,
    handleFileChange,
    startCameraEnhanced,
    handleClose,
    handleSelectFrame,
    handleSelectOverlay,
  };
}