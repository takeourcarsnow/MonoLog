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
  /**
   * Optional initial data URL of an existing photo to edit (e.g. when user chooses
   * "Edit photo" from the uploader). When provided we bypass the live camera stream
   * and immediately load the image into the preview canvases with current effect settings.
   */
  initialDataUrl?: string;
  /**
   * Whether to close the camera after capturing and confirming a photo.
   * For editing, true; for adding multiple photos, false.
   */
  closeAfterCapture?: boolean;
}

export function LiveCameraView({ isOpen, onClose, onCapture, processing, isModal = true, initialDataUrl, closeAfterCapture = true }: LiveCameraViewProps) {
  const { setIsCameraOpen } = useCameraContext();
  const { videoRef, streamRef, facingMode, zoom, setZoom, torchEnabled, isSwitchingCamera, startCamera, stopCamera, switchCamera, toggleTorch, applyZoom } = useCamera();
  const { sourceCanvasRef, displayCanvasRef, startRenderLoop, stopRenderLoop } = useRenderLoop();
  // Pass streamRef into useCapture so it can attempt ImageCapture.takePhoto
  const { handleCapture: performCapture } = useCapture(streamRef);

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

  // When previewing a static image (isPreviewing) we should still allow
  // the user to interact with effect controls and add files. Only disable
  // controls when capturing, processing, or when the camera is not ready
  // and we're not previewing an imported image.
  // Capture logic (includes preview/confirm/retake handlers)
  const { handleCapture, previewBlob, previewUrl, isPreviewing, confirmCapture, retakeCapture, setPreviewFromBlob } = useCaptureLogic({
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
    closeAfterCapture,
  });

  const disabled = isCapturing || processing || (!cameraReady && !isPreviewing);

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

  // Controls should only be disabled while actively capturing or processing.
  // Allow controls while previewing so the user can edit the imported image.
  const controlsDisabled = isCapturing || processing;

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
      // Only start camera if we are NOT editing an existing photo
      if (!initialDataUrl) {
        startCameraEnhanced();
      }
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
    if (initialDataUrl) return; // editing existing photo: don't manage camera automatically
    if (isOpen && !processing) {
      startCameraEnhanced();
    } else {
      stopCamera();
      stopRenderLoop();
    }
  }, [isOpen, processing, startCameraEnhanced, stopCamera, stopRenderLoop, initialDataUrl]);

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

  // If an initialDataUrl was provided (editing existing photo) load it into preview once.
  useEffect(() => {
    if (!isOpen || !initialDataUrl) return;
    // Convert data URL to blob then set preview.
    // If preview already active, do nothing (prevents double-set)
    if (isPreviewing || previewUrl) return;
    let canceled = false;
    (async () => {
      try {
        const blob = dataURLToBlob(initialDataUrl);
        if (!canceled) {
          setPreviewFromBlob(blob);
          // Ensure camera is stopped so it doesn't overwrite the preview
          stopCamera();
          stopRenderLoop();
        }
      } catch (e) {
        console.warn('Failed to load initial data url into LiveCameraView', e);
      }
    })();
    return () => { canceled = true; };
  }, [isOpen, initialDataUrl, setPreviewFromBlob, stopCamera, stopRenderLoop]);

  function dataURLToBlob(dataUrl: string): Blob {
    const [header, base64] = dataUrl.split(',');
    const mimeMatch = header.match(/data:(.*);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const len = binary.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

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

      // If we're previewing an imported file blob, prefer using the
      // image's natural resolution for the backing store so that when the
      // user confirms the photo we export at (close to) the original
      // resolution instead of the smaller UI-sized canvas. Clamp to a
      // reasonable maximum to avoid very large canvases that OOM.
      const MAX_BACKING = 4096; // pixels on the largest side
      let backingW: number;
      let backingH: number;
      if (previewBlob && img.naturalWidth && img.naturalHeight) {
        const imgW = img.naturalWidth || img.width || 1;
        const imgH = img.naturalHeight || img.height || 1;
        // Scale down only if an axis exceeds MAX_BACKING
        if (imgW > imgH) {
          const scale = Math.min(1, MAX_BACKING / imgW);
          backingW = Math.max(1, Math.round(imgW * scale));
          backingH = Math.max(1, Math.round(imgH * scale));
        } else {
          const scale = Math.min(1, MAX_BACKING / imgH);
          backingH = Math.max(1, Math.round(imgH * scale));
          backingW = Math.max(1, Math.round(imgW * scale));
        }
      } else {
        backingW = Math.max(1, Math.round(cssW * dpr));
        backingH = Math.max(1, Math.round(cssH * dpr));
      }

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
        gap: 12,
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
        disabled={controlsDisabled}
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
