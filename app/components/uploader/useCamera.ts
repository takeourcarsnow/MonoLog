"use client";

import { useRef, useCallback, useState } from "react";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [zoom, setZoom] = useState(1);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  const startCamera = useCallback(async (preferredFacingMode?: 'user' | 'environment') => {
    try {
      // Defensive: use typeof so this call won't throw if facingMode isn't defined
      // due to unexpected bundling/runtime issues. Fallback to 'environment'.
      const mode = preferredFacingMode ?? (typeof facingMode !== 'undefined' ? facingMode : 'environment');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });

      streamRef.current = stream;
      setFacingMode(mode);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to access camera';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not support the requested settings.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Camera access blocked due to security restrictions.';
      }
      
      throw new Error(errorMessage);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
      videoRef.current.srcObject = null;
      videoRef.current.currentTime = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const switchCamera = useCallback(async () => {
    if (isSwitchingCamera) return; // Prevent multiple simultaneous switches
    
    setIsSwitchingCamera(true);
    try {
      // Defensive check: use typeof to avoid ReferenceError if facingMode is missing at runtime
      const newMode = (typeof facingMode !== 'undefined' && facingMode === 'user') ? 'environment' : 'user';
      await stopCamera();
      await startCamera(newMode);
    } catch (error) {
      console.error('Error switching camera:', error);
    } finally {
      setIsSwitchingCamera(false);
    }
  }, [facingMode, stopCamera, startCamera, isSwitchingCamera]);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    
    const track = streamRef.current.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as any;
    
    if (capabilities.torch) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: !torchEnabled } as any]
        });
        setTorchEnabled(!torchEnabled);
      } catch (error) {
        console.error('Error toggling torch:', error);
      }
    }
  }, [torchEnabled]);

  const applyZoom = useCallback((canvas: HTMLCanvasElement) => {
    // When zoom > 1 we want to crop the central region of the source canvas
    // and scale it up to fill the canvas. Using getImageData/putImageData
    // produces pixel-aligned fragments and does not scale, which causes the
    // visual artifacts you saw (repeated/misaligned tiles). Instead use an
    // offscreen canvas and drawImage to perform a proper scaled draw.
    if (zoom > 1) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      // Source crop size (in source pixels)
      const zoomedWidth = Math.max(1, Math.round(canvas.width / zoom));
      const zoomedHeight = Math.max(1, Math.round(canvas.height / zoom));

      // Ensure integer and clamped coordinates
      const sx = Math.max(0, Math.min(canvas.width - zoomedWidth, Math.round(centerX - zoomedWidth / 2)));
      const sy = Math.max(0, Math.min(canvas.height - zoomedHeight, Math.round(centerY - zoomedHeight / 2)));

      // Use an offscreen copy to avoid reading/writing the same canvas while
      // drawing (which can produce tearing/artifacts on some browsers).
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width;
      tmp.height = canvas.height;
      const tctx = tmp.getContext('2d');
      if (!tctx) return;
      // copy current canvas into temp
      tctx.drawImage(canvas, 0, 0);

      // Clear destination and draw the cropped region scaled to full canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        tmp,
        sx, sy, zoomedWidth, zoomedHeight, // source rect
        0, 0, canvas.width, canvas.height // destination rect scaled to canvas
      );
    }
  }, [zoom]);

  return {
    videoRef,
    streamRef,
    facingMode,
    zoom,
    setZoom,
    torchEnabled,
    isSwitchingCamera,
    startCamera,
    stopCamera,
    switchCamera,
    toggleTorch,
    applyZoom,
  };
}