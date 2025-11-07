"use client";

/**
 * LiveCameraView - Real-time camera with visual effects
 *
 * Provides a live camera view with real-time effect overlays (dithering, pixelation, ASCII).
 * Uses getUserMedia API for camera access and dual canvas system for efficient processing:
 * - Source canvas: captures raw video frames
 * - Display canvas: shows processed frames with effects
 *
 * Effects are applied in real-time using requestAnimationFrame loop.
 * Falls back to traditional file input on browsers without getUserMedia support.
 */

import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw, ZoomIn, ZoomOut, X, Camera as CameraIcon, Eye, EyeOff } from 'lucide-react';
import { Button } from "@/app/components/ui/Button";
import Portal from "@/app/components/ui/Portal";
import LogoLoader from "./LogoLoader";
import { CameraEffectSettings, CameraEffectType } from "./cameraEffects";
import { getFrameFiles } from "@/app/components/imageEditor/framesPreload";
import { getOverlayFiles } from "@/app/components/imageEditor/overlaysPreload";
import { useCamera } from "./useCamera";
import { useRenderLoop } from "./useRenderLoop";
import { useCapture } from "./useCapture";
import { EffectControls } from "./EffectControls";
import { PixelateControls } from "./PixelateControls";
import { DitherControls } from "./DitherControls";
import { AsciiControls } from "./AsciiControls";
import { FrameSelector } from "./FrameSelector";
import { OverlaySelector } from "./OverlaySelector";

interface LiveCameraViewProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
  processing: boolean;
}

export function LiveCameraView({ isOpen, onClose, onCapture, processing }: LiveCameraViewProps) {
  const { videoRef, streamRef, facingMode, zoom, setZoom, torchEnabled, startCamera, stopCamera, switchCamera, toggleTorch, applyZoom } = useCamera();
  const { sourceCanvasRef, displayCanvasRef, startRenderLoop, stopRenderLoop } = useRenderLoop();
  const { handleCapture: performCapture } = useCapture();

  const [effectSettings, setEffectSettings] = useState<CameraEffectSettings>({
    type: 'none',
    pixelSize: 8,
    pixelShape: 'square',
    ditherMethod: 'ordered',
    ditherLevels: 3,
    ditherColorMode: 'bw',
    ditherPalette: 'auto',
    asciiCellSize: 10,
    asciiCharset: ' .:-=+*#%@',
    asciiInvert: false,
    asciiCharsetPreset: 'custom',
    frameOverlay: null,
    overlay: null,
  });

  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showProcessingOverlay, setShowProcessingOverlay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [effectsLoaded, setEffectsLoaded] = useState(false);

  // Overlay visibility
  const [overlayVisible, setOverlayVisible] = useState(true);
  const toggleOverlay = useCallback(() => setOverlayVisible(v => !v), []);

  // Track processing state changes
  const [wasProcessing, setWasProcessing] = useState(false);

  // Frame and overlay state
  const [frameFiles, setFrameFiles] = useState<string[]>([]);
  const [overlayFiles, setOverlayFiles] = useState<string[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);

  // Mobile touch handling
  const [pinchDistance, setPinchDistance] = useState(0);

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
  }, [startCamera, videoRef]);

  // Handle capture
  const handleCapture = useCallback(() => {
    // Prevent multiple captures
    if (isCapturing || processing) return;

    setIsCapturing(true);
    setShowProcessingOverlay(true);

    // Stop the camera stream immediately to freeze the view
    stopCamera();

    // Stop the render loop to freeze the view
    stopRenderLoop();

    performCapture(
      isCapturing,
      processing,
      (blob) => {
        onCapture(blob);
        // Close modal instantly after capture
        onClose();
      },
      effectSettings,
      sourceCanvasRef,
      displayCanvasRef,
      stopCamera
    );
  }, [isCapturing, processing, onCapture, effectSettings, sourceCanvasRef, displayCanvasRef, stopCamera, stopRenderLoop, performCapture, onClose]);

  // Handle close
  const handleClose = useCallback(() => {
    stopCamera();
    stopRenderLoop();
    setIsCapturing(false);
    setShowProcessingOverlay(false);
    onClose();
  }, [stopCamera, stopRenderLoop, onClose]);

  // Handle frame selection
  const handleSelectFrame = useCallback((file: string) => {
    const url = `/frames/${file}`;
    if (selectedFrame === file) {
      // Toggle off
      setSelectedFrame(null);
      setEffectSettings(prev => ({ ...prev, frameOverlay: null }));
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

      setEffectSettings(prev => ({
        ...prev,
        frameOverlay: { img, opacity: 1, bounds }
      }));
    };
  }, [selectedFrame]);

  // Handle overlay selection
  const handleSelectOverlay = useCallback((file: string) => {
    const url = `/overlays/${file}`;
    if (selectedOverlay === file) {
      // Toggle off
      setSelectedOverlay(null);
      setEffectSettings(prev => ({ ...prev, overlay: null }));
      return;
    }

    setSelectedOverlay(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      setEffectSettings(prev => ({
        ...prev,
        overlay: { img, blendMode: 'screen', opacity: 0.85 }
      }));
    };
  }, [selectedOverlay]);

  // Setup camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsCapturing(false); // Reset capturing state when modal opens
      setShowProcessingOverlay(false);
      startCameraEnhanced();
      // Load frames and overlays
      getFrameFiles().then(setFrameFiles).catch(() => setFrameFiles([]));
      getOverlayFiles().then(setOverlayFiles).catch(() => setOverlayFiles([]));
    } else {
      stopCamera();
      stopRenderLoop();
    }

    return () => {
      stopCamera();
      stopRenderLoop();
    };
  }, [isOpen, startCameraEnhanced, stopCamera, stopRenderLoop]);

  // Handle processing state changes
  useEffect(() => {
    if (wasProcessing && !processing && isOpen) {
      // Processing just finished - reset states and restart camera
      setIsCapturing(false);
      setShowProcessingOverlay(false);
    }
    setWasProcessing(processing);
  }, [processing, wasProcessing, isOpen]);

  // Control camera stream based on processing state
  useEffect(() => {
    if (isOpen && !processing) {
      startCameraEnhanced();
    } else {
      stopCamera();
      stopRenderLoop();
    }
  }, [isOpen, processing, startCameraEnhanced, stopCamera, stopRenderLoop]);

  // Start render loop when camera is ready and not capturing
  useEffect(() => {
    if (cameraReady && !isCapturing) {
      startRenderLoop(effectSettings, isCapturing, videoRef, streamRef, applyZoom);
    } else {
      stopRenderLoop();
    }

    return () => {
      stopRenderLoop();
    };
  }, [cameraReady, isCapturing, effectSettings, startRenderLoop, stopRenderLoop, videoRef, streamRef, applyZoom]);

  // Progressive loading of effects
  useEffect(() => {
    if (isOpen) {
      // Load frames and overlays progressively
      getFrameFiles().then(setFrameFiles).catch(() => setFrameFiles([]));
      getOverlayFiles().then(setOverlayFiles).catch(() => setOverlayFiles([]));
      
      // Mark effects as loaded after a short delay to simulate loading
      const timer = setTimeout(() => setEffectsLoaded(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Mobile touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setPinchDistance(distance);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDistance > 0) {
      e.preventDefault(); // Prevent scrolling
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = distance / pinchDistance;
      setZoom(prev => Math.max(1, Math.min(5, prev * scale)));
      setPinchDistance(distance);
    }
  }, [pinchDistance]);

  const handleTouchEnd = useCallback(() => {
    setPinchDistance(0);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          if (cameraReady && !isCapturing && !processing) {
            handleCapture();
          }
          break;
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          switchCamera();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleTorch();
          break;
        case 'o':
        case 'O':
          e.preventDefault();
          toggleOverlay();
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoom(prev => Math.min(5, prev + 0.5));
          break;
        case '-':
        case '_':
          e.preventDefault();
          setZoom(prev => Math.max(1, prev - 0.5));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cameraReady, isCapturing, processing, handleCapture, handleClose, switchCamera, toggleTorch, toggleOverlay]);

  // Add modal blur effect
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-blur');
    } else {
      document.body.classList.remove('modal-blur');
    }

    return () => {
      document.body.classList.remove('modal-blur');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const disabled = isCapturing || processing || !cameraReady;

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal={true}
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
          zIndex: 20,
          background: 'rgba(0,0,0,0.85)',
          overflowY: 'auto',
        }}
        onClick={handleClose}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 720,
            maxHeight: 'calc(100vh - 24px)',
            background: 'var(--bg)',
            borderRadius: 6,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            margin: 'auto',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Video and canvas container */}
          <div style={{ position: 'relative', width: '100%', borderRadius: 6, overflow: 'hidden', background: '#000' }}>
            {/* Hidden video element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ display: 'none' }}
            />

            {/* Hidden source canvas (for capturing raw frames) */}
            <canvas ref={sourceCanvasRef} style={{ display: 'none' }} />

            {/* Display canvas (shows effects) */}
            <canvas
              ref={displayCanvasRef}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: 6,
                filter: showProcessingOverlay ? 'blur(8px) brightness(0.7)' : 'none',
                transition: 'filter 0.2s ease',
                touchAction: 'none', // Prevent default touch behaviors
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              aria-label={`Live camera preview with ${effectSettings.type} effect applied`}
              role="img"
            />

            {/* Controls overlay at bottom of photo */}
            {cameraReady && !showProcessingOverlay && overlayVisible && (
                <div style={{
                  position: 'absolute',
                  bottom: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  zIndex: 3,
                  background: 'rgba(0,0,0,0.18)',
                  padding: '6px 8px',
                  borderRadius: 12,
                }}>
                {/* Switch camera (left) */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                      onClick={switchCamera}
                      disabled={disabled}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        cursor: 'pointer'
                      }}
                      aria-label="Switch camera"
                      title="Switch between front and back camera"
                    >
                      <RefreshCw size={14} />
                    </button>
                </div>

                {/* Center group: zoom out, capture, zoom in */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => setZoom(prev => Math.max(1, prev - 0.5))}
                    disabled={disabled || zoom <= 1}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      cursor: 'pointer'
                    }}
                    aria-label="Zoom out"
                    title="Zoom out"
                  >
                    <ZoomOut size={14} />
                  </button>

                  <button
                    onClick={handleCapture}
                    disabled={!cameraReady || disabled}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      background: 'transparent',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: !cameraReady || disabled ? 'not-allowed' : 'pointer'
                    }}
                    aria-label="Capture photo"
                    title="Capture"
                  >
                    {isCapturing || processing ? (
                      <LogoLoader size={16} variant="other" />
                    ) : (
                      <CameraIcon size={16} color="#ff3b30" />
                    )}
                  </button>

                  <button
                    onClick={() => setZoom(prev => Math.min(5, prev + 0.5))}
                    disabled={disabled || zoom >= 5}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      cursor: 'pointer'
                    }}
                    aria-label="Zoom in"
                    title="Zoom in"
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>

                {/* Close (right) */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={handleClose}
                    disabled={disabled}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      cursor: 'pointer'
                    }}
                    aria-label="Close camera"
                    title="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(0,0,0,0.8)',
                  color: '#fff',
                  padding: 16,
                  borderRadius: 8,
                  textAlign: 'center',
                  maxWidth: '80%',
                  zIndex: 4,
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 8 }}>📷</div>
                <div style={{ fontSize: 14, marginBottom: 12 }}>{error}</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <Button onClick={startCameraEnhanced} size="sm">
                    Try Again
                  </Button>
                  <Button onClick={onClose} variant="ghost" size="sm">
                    Close
                  </Button>
                </div>
              </div>
            )}

            {!cameraReady && !error && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#fff',
                  zIndex: 2,
                }}
              >
                <LogoLoader size={40} variant="other" />
              </div>
            )}

            {showProcessingOverlay && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: 6,
                  zIndex: 1,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <LogoLoader size={48} variant="other" />
                  <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 500 }}>Processing...</span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons moved into bottom overlay for compact UI */}

          {/* Status info removed for simplified layout */}

          {/* Loading indicator removed for simplified layout */}

          {/* Effect selection buttons */}
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ padding: 4, borderRadius: 8, background: 'rgba(0,0,0,0.14)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <EffectControls
                effectType={effectSettings.type}
                onEffectChange={(type) => setEffectSettings({ ...effectSettings, type })}
                disabled={disabled}
                overlayVisible={overlayVisible}
                toggleOverlay={toggleOverlay}
              />
            </div>
          </div>

          {/* Effect-specific controls */}
          {effectSettings.type === 'pixelate' && (
            <PixelateControls
              effectSettings={effectSettings}
              onSettingsChange={setEffectSettings}
              disabled={disabled}
            />
          )}

          {effectSettings.type === 'dither' && (
            <DitherControls
              effectSettings={effectSettings}
              onSettingsChange={setEffectSettings}
              disabled={disabled}
            />
          )}

          {effectSettings.type === 'ascii' && (
            <AsciiControls
              effectSettings={effectSettings}
              onSettingsChange={setEffectSettings}
              disabled={disabled}
            />
          )}

          {/* Frame selection panel */}
          {effectSettings.type === 'frame' && (
            <FrameSelector
              frameFiles={frameFiles}
              selectedFrame={selectedFrame}
              onSelectFrame={handleSelectFrame}
              disabled={disabled}
            />
          )}

          {/* Overlay selection panel */}
          {effectSettings.type === 'overlay' && (
            <OverlaySelector
              overlayFiles={overlayFiles}
              selectedOverlay={selectedOverlay}
              effectSettings={effectSettings}
              onSelectOverlay={handleSelectOverlay}
              onSettingsChange={setEffectSettings}
              disabled={disabled}
            />
          )}

        </div>
      </div>
    </Portal>
  );
}
