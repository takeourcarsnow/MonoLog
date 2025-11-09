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

import React, { useEffect, useRef, useCallback } from "react";
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
import { BasicControls } from "./BasicControls";
import { FilterControls } from "./FilterControls";
import { EffectsControls } from "./EffectsControls";
import { TextControls } from "./TextControls";
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
    isDraggingText,
    setIsDraggingText,
    dragStartX,
    setDragStartX,
    dragStartY,
    setDragStartY,
  } = useLiveCameraState();

  const disabled = isCapturing || processing || !cameraReady;

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

  // Text drag handlers with throttling for better performance
  const dragUpdateRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const updateDragPosition = useCallback(() => {
    if (dragUpdateRef.current) {
      const { x, y } = dragUpdateRef.current;
      setEffectSettings(prev => ({
        ...prev,
        textX: x,
        textY: y,
      }));
      dragUpdateRef.current = null;
    }
    rafRef.current = null;
  }, [setEffectSettings]);

  const throttledSetDragPosition = useCallback((x: number, y: number) => {
    dragUpdateRef.current = { x, y };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(updateDragPosition);
    }
  }, [updateDragPosition]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (effectSettings.type === 'text' && effectSettings.textContent && !disabled) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      setIsDraggingText(true);
      setDragStartX(x);
      setDragStartY(y);
      throttledSetDragPosition(x, y);
    }
  }, [effectSettings.type, effectSettings.textContent, disabled, setEffectSettings, setIsDraggingText, setDragStartX, setDragStartY, throttledSetDragPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingText && effectSettings.type === 'text') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      throttledSetDragPosition(x, y);
    }
  }, [isDraggingText, effectSettings.type, throttledSetDragPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingText(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Final update to ensure position is set
    if (dragUpdateRef.current) {
      updateDragPosition();
    }
  }, [setIsDraggingText, updateDragPosition]);

  // Enhanced touch handlers for text dragging with throttling
  const handleTouchStartEnhanced = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    // Handle pinch zoom first
    handleTouchStart(e);

    // Handle text dragging
    if (effectSettings.type === 'text' && effectSettings.textContent && !disabled && e.touches.length === 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) / rect.width;
      const y = (touch.clientY - rect.top) / rect.height;

      setIsDraggingText(true);
      setDragStartX(x);
      setDragStartY(y);
      throttledSetDragPosition(x, y);
    }
  }, [effectSettings.type, effectSettings.textContent, disabled, handleTouchStart, setEffectSettings, setIsDraggingText, setDragStartX, setDragStartY, throttledSetDragPosition]);

  const handleTouchMoveEnhanced = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    // Handle pinch zoom
    handleTouchMove(e);

    // Handle text dragging
    if (isDraggingText && effectSettings.type === 'text' && e.touches.length === 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const touch = e.touches[0];
      const x = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));

      throttledSetDragPosition(x, y);
    }
  }, [isDraggingText, effectSettings.type, handleTouchMove, throttledSetDragPosition]);

  const handleTouchEndEnhanced = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    handleTouchEnd(); // Reset pinch distance
    setIsDraggingText(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Final update to ensure position is set
    if (dragUpdateRef.current) {
      updateDragPosition();
    }
  }, [handleTouchEnd, setIsDraggingText, updateDragPosition]);

  // Capture logic (includes preview/confirm/retake handlers)
  const { handleCapture, previewUrl, isPreviewing, confirmCapture, retakeCapture } = useCaptureLogic({
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

  // disable UI controls while previewing
  const controlsDisabled = disabled || isPreviewing;

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending RAF updates
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Clear drag state
      dragUpdateRef.current = null;
    };
  }, []);

  if (!isOpen) return null;

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
                cursor: effectSettings.type === 'text' && effectSettings.textContent && !disabled ? 'move' : 'default',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStartEnhanced}
              onTouchMove={handleTouchMoveEnhanced}
              onTouchEnd={handleTouchEndEnhanced}
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
              disabled={controlsDisabled}
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
              isPreviewing={isPreviewing}
              confirmCapture={confirmCapture}
              retakeCapture={() => { retakeCapture(); startCameraEnhanced(); startRenderLoop(effectSettings, false, videoRef, streamRef, applyZoom); }}
            />

            <CameraError error={error} startCameraEnhanced={startCameraEnhanced} onClose={onClose} />

            <CameraLoading cameraReady={cameraReady} error={error} />

            <CameraProcessingOverlay showProcessingOverlay={showProcessingOverlay} />

            {/* When previewing, show the captured image on top of the display canvas (no separate overlay bar) */}
            {isPreviewing && previewUrl && (
              <img src={previewUrl} alt="Captured preview" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 2, borderRadius: 6 }} />
            )}
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
          {effectSettings.type === 'basic' && (
            <BasicControls
              effectSettings={effectSettings}
              onSettingsChange={setEffectSettings}
              disabled={disabled}
            />
          )}

          {effectSettings.type === 'filters' && (
            <FilterControls
              effectSettings={effectSettings}
              onSettingsChange={setEffectSettings}
              disabled={disabled}
            />
          )}

          {effectSettings.type === 'effects' && (
            <EffectsControls
              effectSettings={effectSettings}
              onSettingsChange={setEffectSettings}
              disabled={disabled}
            />
          )}

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

          {effectSettings.type === 'text' && (
            <TextControls
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
