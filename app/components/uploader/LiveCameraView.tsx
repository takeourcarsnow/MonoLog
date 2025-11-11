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
import { getFrameFiles } from "@/app/components/imageEditor/framesPreload";
import { getOverlayFiles } from "@/app/components/imageEditor/overlaysPreload";
import { useCamera } from "./useCamera";
import { useRenderLoop } from "./useRenderLoop";
import { useCapture } from "./useCapture";
import { useLiveCameraState, DEFAULT_EFFECT_SETTINGS } from "./useLiveCameraState";
import { useCameraHandlers } from "./useCameraHandlers";
import { useTouchHandlers } from "./useTouchHandlers";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useCaptureLogic } from "./useCaptureLogic";
import { applyCameraEffect } from "./cameraEffects";
import { LiveCameraCanvas } from "./LiveCameraCanvas";
import { LiveCameraControlsPanel } from "./LiveCameraControlsPanel";
import { LiveCameraModalWrapper } from "./LiveCameraModalWrapper";
import { useTextManipulation } from "./useTextManipulation";
import { useInlineEditing } from "./useInlineEditing";
import { useCameraContext } from "../context/CameraContext";

interface LiveCameraViewProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
  processing: boolean;
  isModal?: boolean;
}

export function LiveCameraView({ isOpen, onClose, onCapture, processing, isModal = true }: LiveCameraViewProps) {
  const { setIsCameraOpen } = useCameraContext();
  const { videoRef, streamRef, facingMode, zoom, setZoom, torchEnabled, isSwitchingCamera, startCamera, stopCamera, switchCamera, toggleTorch, applyZoom } = useCamera();
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

  const [lastTapTime, setLastTapTime] = React.useState(0);
  const [tapCount, setTapCount] = React.useState(0);

  const disabled = isCapturing || processing || !cameraReady;

  // Capture logic (includes preview/confirm/retake handlers)
  const { handleCapture, previewUrl, isPreviewing, confirmCapture, retakeCapture, setPreviewFromBlob } = useCaptureLogic({
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
    setPreviewFromBlob,
  });

  // Touch handlers
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchHandlers({
    pinchDistance,
    setPinchDistance,
    setZoom,
  });

  // Text manipulation
  const {
    isDraggingText,
    isManipulatingText,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStartEnhanced,
    handleTouchMoveEnhanced,
    handleTouchEndEnhanced,
    cleanup: cleanupTextManipulation,
  } = useTextManipulation(setEffectSettings, disabled, effectSettings);

  // Inline editing
  const {
    isInlineEditing,
    inlineEditText,
    inlineEditRef,
    handleInlineEditChange,
    handleInlineEditBlur,
    handleInlineEditKeyDown,
    startInlineEditing,
    setIsInlineEditing,
    setInlineEditText,
  } = useInlineEditing(setEffectSettings);

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
    setIsCameraOpen(isOpen);
    if (isOpen) {
      setIsCapturing(false); // Reset capturing state when modal opens
      setShowProcessingOverlay(false);
      startCameraEnhanced();
      // Load frames and overlays
      getFrameFiles().then(setFrameFiles).catch(() => setFrameFiles([]));
      getOverlayFiles().then(setOverlayFiles).catch(() => setOverlayFiles([]));
      // Prevent body scrolling when in full-screen mode
      if (!isModal && typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden';
      }
    } else {
      stopCamera();
      stopRenderLoop();
      // Restore body scrolling
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    }

    return () => {
      setIsCameraOpen(false);
      stopCamera();
      stopRenderLoop();
      // Restore body scrolling on unmount
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, startCameraEnhanced, stopCamera, stopRenderLoop, setIsCameraOpen, isModal]);

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

  // Start render loop when camera is ready and not capturing or previewing
  // If we're previewing an imported image (isPreviewing) we must NOT run the
  // live render loop otherwise the camera stream may restart and overwrite
  // the preview canvas. Respect isPreviewing to avoid that.
  useEffect(() => {
    if (cameraReady && !isCapturing && !isPreviewing) {
      startRenderLoop(effectSettings, isCapturing, videoRef, streamRef, applyZoom);
    } else {
      stopRenderLoop();
    }

    return () => {
      stopRenderLoop();
    };
  }, [cameraReady, isCapturing, isPreviewing, effectSettings, startRenderLoop, stopRenderLoop, videoRef, streamRef, applyZoom]);

  // When previewing a captured blob or imported file, draw it into the
  // source/display canvases and re-apply effects whenever settings change.
  useEffect(() => {
    if (!isPreviewing || !previewUrl) return;

    let mounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = previewUrl;

    const doRender = () => {
      const src = sourceCanvasRef.current;
      const disp = displayCanvasRef.current;
      if (!src || !disp) return;

      // Fit image into available display area (contain) — never crop.
      // Compute target CSS size from display canvas container (the element
      // that holds the canvas is sized responsively). We'll size the canvas
      // backing store to the CSS size * devicePixelRatio for crisp rendering.
      const container = disp.parentElement || disp;
      const containerRect = container.getBoundingClientRect();
      const containerW = Math.max(1, Math.round(containerRect.width));
      // Use container width and compute height to preserve image aspect ratio
      const imgW = img.naturalWidth || img.width || 1;
      const imgH = img.naturalHeight || img.height || 1;
      const imgAspect = imgW / imgH;

      // Fit by width then adjust height to preserve aspect ratio; if the
      // container's height is less than computed height, scale down to fit height.
      let cssW = containerW;
      let cssH = Math.round(cssW / imgAspect);
      const containerH = Math.max(1, Math.round(containerRect.height));
      if (cssH > containerH) {
        cssH = containerH;
        cssW = Math.round(cssH * imgAspect);
      }

      const dpr = window.devicePixelRatio || 1;
      const backingW = Math.max(1, Math.round(cssW * dpr));
      const backingH = Math.max(1, Math.round(cssH * dpr));

      src.width = backingW;
      src.height = backingH;
      disp.width = backingW;
      disp.height = backingH;

      // Keep canvas element CSS sized to the computed cssW/cssH so it fits
      // in the UI without cropping
      disp.style.width = `${cssW}px`;
      disp.style.height = `${cssH}px`;

      const sctx = src.getContext('2d', { willReadFrequently: true });
      const dctx = disp.getContext('2d');
      if (!sctx || !dctx) return;

      // Clear and draw the image scaled to backing size (contain)
      sctx.clearRect(0, 0, backingW, backingH);
      // use drawImage with computed destination to preserve aspect in backing pixels
      sctx.drawImage(img, 0, 0, backingW, backingH);

      try {
        // applyCameraEffect expects source/display canvases; they are now sized
        // to the CSS container and will receive effects correctly.
        applyCameraEffect(src, disp, effectSettings);
      } catch (e) {
        // Fallback: blit the source into display
        dctx.clearRect(0, 0, backingW, backingH);
        dctx.drawImage(src, 0, 0, backingW, backingH);
      }
    };

    if (img.complete && img.naturalWidth) {
      if (mounted) doRender();
    } else {
      img.onload = () => { if (!mounted) return; doRender(); };
      img.onerror = () => { /* ignore load errors */ };
    }

    return () => { mounted = false; };
  }, [isPreviewing, previewUrl, effectSettings, sourceCanvasRef, displayCanvasRef]);

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
      cleanupTextManipulation();
    };
  }, [cleanupTextManipulation]);

  if (!isOpen) return null;

  const content = (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--bg)',
        borderRadius: isModal ? 6 : 0,
        padding: isModal ? 8 : 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        margin: isModal ? 'auto' : 0,
        overflow: isModal ? 'auto' : 'hidden',
      }}
      onClick={isModal ? (e) => e.stopPropagation() : undefined}
    >
      <LiveCameraCanvas
        videoRef={videoRef}
        sourceCanvasRef={sourceCanvasRef}
        displayCanvasRef={displayCanvasRef}
        fileInputRef={fileInputRef}
        inlineEditRef={inlineEditRef}
        effectSettings={effectSettings}
        disabled={disabled}
        controlsDisabled={controlsDisabled}
        cameraReady={cameraReady}
        isCapturing={isCapturing}
        processing={processing}
        zoom={zoom}
        overlayVisible={overlayVisible}
        isSwitchingCamera={isSwitchingCamera}
        showProcessingOverlay={showProcessingOverlay}
        error={error}
        isPreviewing={isPreviewing}
        isInlineEditing={isInlineEditing}
        inlineEditText={inlineEditText}
        switchCamera={switchCamera}
        openFilePicker={openFilePicker}
        setZoom={setZoom}
        handleCapture={handleCapture}
        handleClose={handleClose}
        confirmCapture={confirmCapture}
        retakeCapture={retakeCapture}
        startCameraEnhanced={startCameraEnhanced}
        startRenderLoop={startRenderLoop}
        streamRef={streamRef}
        applyZoom={applyZoom}
        handleMouseDown={handleMouseDown}
        handleMouseMove={handleMouseMove}
        handleMouseUp={handleMouseUp}
        handleWheel={handleWheel}
        handleTouchStartEnhanced={handleTouchStartEnhanced}
        handleTouchMoveEnhanced={handleTouchMoveEnhanced}
        handleTouchEndEnhanced={handleTouchEndEnhanced}
        handleInlineEditChange={handleInlineEditChange}
        handleInlineEditBlur={handleInlineEditBlur}
        handleInlineEditKeyDown={handleInlineEditKeyDown}
        setIsInlineEditing={setIsInlineEditing}
        setInlineEditText={setInlineEditText}
        handleFileChange={handleFileChange}
        onClose={onClose}
        isModal={isModal}
      />

      <LiveCameraControlsPanel
        effectSettings={effectSettings}
        setEffectSettings={setEffectSettings}
        disabled={disabled}
        overlayVisible={overlayVisible}
        toggleOverlay={toggleOverlay}
        frameFiles={frameFiles}
        selectedFrame={selectedFrame}
        handleSelectFrame={handleSelectFrame}
        overlayFiles={overlayFiles}
        selectedOverlay={selectedOverlay}
        handleSelectOverlay={handleSelectOverlay}
        setSelectedFrame={setSelectedFrame}
        setSelectedOverlay={setSelectedOverlay}
      />
    </div>
  );

  return (
    <LiveCameraModalWrapper isModal={isModal} onClose={onClose}>
      {content}
    </LiveCameraModalWrapper>
  );
}
