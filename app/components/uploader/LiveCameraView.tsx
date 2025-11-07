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

import React, { useEffect, useRef } from "react";
import Portal from "@/app/components/ui/Portal";
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
import { useLiveCameraState } from "./useLiveCameraState";
import { useCameraHandlers } from "./useCameraHandlers";
import { useTouchHandlers } from "./useTouchHandlers";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useCaptureLogic } from "./useCaptureLogic";
import { CameraControls } from "./CameraControls";
import { CameraError } from "./CameraError";
import { CameraLoading } from "./CameraLoading";
import { CameraProcessingOverlay } from "./CameraProcessingOverlay";

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

  // State management
  const {
    effectSettings,
    setEffectSettings,
    cameraReady,
    setCameraReady,
    isCapturing,
    setIsCapturing,
    showProcessingOverlay,
    setShowProcessingOverlay,
    error,
    setError,
    effectsLoaded,
    setEffectsLoaded,
    overlayVisible,
    toggleOverlay,
    wasProcessing,
    setWasProcessing,
    frameFiles,
    setFrameFiles,
    overlayFiles,
    setOverlayFiles,
    selectedFrame,
    setSelectedFrame,
    selectedOverlay,
    setSelectedOverlay,
    pinchDistance,
    setPinchDistance,
  } = useLiveCameraState();

  // Handlers
  const {
    fileInputRef,
    openFilePicker,
    handleFileChange,
    startCameraEnhanced,
    handleClose,
    handleSelectFrame,
    handleSelectOverlay,
  } = useCameraHandlers({
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
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    startCamera,
  });

  // Touch handlers
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchHandlers({
    pinchDistance,
    setPinchDistance,
    setZoom,
  });

  // Capture logic
  const { handleCapture } = useCaptureLogic({
    isCapturing,
    processing,
    onCapture,
    effectSettings,
    sourceCanvasRef: sourceCanvasRef as React.RefObject<HTMLCanvasElement>,
    displayCanvasRef: displayCanvasRef as React.RefObject<HTMLCanvasElement>,
    stopCamera,
    stopRenderLoop,
    performCapture,
    onClose,
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    isOpen,
    cameraReady,
    isCapturing,
    processing,
    handleCapture,
    handleClose,
    switchCamera,
    toggleTorch,
    toggleOverlay,
    setZoom,
  });

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

            {/* Hidden file input for adding image from files */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <CameraControls
              disabled={disabled}
              cameraReady={cameraReady}
              isCapturing={isCapturing}
              processing={processing}
              zoom={zoom}
              overlayVisible={overlayVisible}
              switchCamera={switchCamera}
              openFilePicker={openFilePicker}
              setZoom={setZoom}
              handleCapture={handleCapture}
              handleClose={handleClose}
            />

            <CameraError error={error} startCameraEnhanced={startCameraEnhanced} onClose={onClose} />

            <CameraLoading cameraReady={cameraReady} error={error} />

            <CameraProcessingOverlay showProcessingOverlay={showProcessingOverlay} />
          </div>

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
