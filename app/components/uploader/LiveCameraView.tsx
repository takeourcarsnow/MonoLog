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
import { ImagePlus } from 'lucide-react';
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
    isDraggingText,
    setIsDraggingText,
    dragStartX,
    setDragStartX,
    dragStartY,
    setDragStartY,
    isManipulatingText,
    setIsManipulatingText,
  } = useLiveCameraState();

  const [lastTapTime, setLastTapTime] = React.useState(0);
  const [tapCount, setTapCount] = React.useState(0);
  const [isInlineEditing, setIsInlineEditing] = React.useState(false);
  const [inlineEditText, setInlineEditText] = React.useState('');
  const inlineEditRef = useRef<HTMLTextAreaElement>(null);

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

  // Text drag and rotation handlers with throttling for better performance
  const dragUpdateRef = useRef<{ x: number; y: number } | null>(null);
  const rotationUpdateRef = useRef<number | undefined>(undefined);
  const scaleUpdateRef = useRef<number | undefined>(undefined);
  const rafRef = useRef<number | null>(null);
  const initialRotationRef = useRef<number>(0);
  const initialTouchAngleRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);
  const initialDistanceRef = useRef<number>(0);

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
    if (rotationUpdateRef.current !== undefined) {
      setEffectSettings(prev => ({
        ...prev,
        textRotation: rotationUpdateRef.current,
      }));
      rotationUpdateRef.current = undefined;
    }
    if (scaleUpdateRef.current !== undefined) {
      setEffectSettings(prev => ({
        ...prev,
        textScale: scaleUpdateRef.current,
      }));
      scaleUpdateRef.current = undefined;
    }
    rafRef.current = null;
  }, [setEffectSettings]);

  const throttledSetDragPosition = useCallback((x: number, y: number) => {
    dragUpdateRef.current = { x, y };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(updateDragPosition);
    }
  }, [updateDragPosition]);

  const throttledSetRotation = useCallback((rotation: number) => {
    rotationUpdateRef.current = rotation;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(updateDragPosition);
    }
  }, [updateDragPosition]);

  const throttledSetScale = useCallback((scale: number) => {
    scaleUpdateRef.current = scale;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(updateDragPosition);
    }
  }, [updateDragPosition]);

  // Helper function to calculate angle between two points
  const getAngle = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (effectSettings.type === 'text' && effectSettings.textContent && !disabled) {
      e.preventDefault();
      setIsInlineEditing(true);
      setInlineEditText(effectSettings.textContent);
      // Focus the textarea after it's rendered
      setTimeout(() => {
        if (inlineEditRef.current) {
          inlineEditRef.current.focus();
          inlineEditRef.current.select();
        }
      }, 0);
    }
  }, [effectSettings.type, effectSettings.textContent, disabled]);

  const handleInlineEditChange = useCallback((value: string) => {
    setInlineEditText(value);
    setEffectSettings(prev => ({
      ...prev,
      textContent: value,
    }));
  }, [setEffectSettings]);

  const handleInlineEditBlur = useCallback(() => {
    setIsInlineEditing(false);
  }, []);

  const handleInlineEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setIsInlineEditing(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Revert changes on escape
      setEffectSettings(prev => ({
        ...prev,
        textContent: inlineEditText,
      }));
      setIsInlineEditing(false);
    }
  }, [inlineEditText, setEffectSettings]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isInlineEditing) return; // Don't handle mouse events during inline editing

    if (effectSettings.type === 'text' && effectSettings.textContent && !disabled) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      if (e.button === 0) { // Left click - drag
        setIsDraggingText(true);
        setDragStartX(x);
        setDragStartY(y);
        throttledSetDragPosition(x, y);
      } else if (e.button === 2) { // Right click - rotate
        e.preventDefault(); // Prevent context menu
        initialRotationRef.current = effectSettings.textRotation || 0;
        setIsDraggingText(true);
        setDragStartX(e.clientX);
        setDragStartY(e.clientY);
      }
    }
  }, [isInlineEditing, effectSettings.type, effectSettings.textContent, effectSettings.textRotation, disabled, setEffectSettings, setIsDraggingText, setDragStartX, setDragStartY, throttledSetDragPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isInlineEditing) return; // Don't handle mouse events during inline editing

    if (isDraggingText && effectSettings.type === 'text') {
      if (e.buttons & 1) { // Left button held - drag
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

        throttledSetDragPosition(x, y);
      } else if (e.buttons & 2) { // Right button held - rotate
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        const newRotation = initialRotationRef.current + angle;

        throttledSetRotation(newRotation);
      }
    }
  }, [isInlineEditing, isDraggingText, effectSettings.type, dragStartX, dragStartY, throttledSetDragPosition, throttledSetRotation]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) {
      e.preventDefault(); // Prevent context menu on right click release
    }
    setIsDraggingText(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Final update to ensure position and rotation are set
    if (dragUpdateRef.current || rotationUpdateRef.current !== undefined) {
      updateDragPosition();
    }
  }, [setIsDraggingText, updateDragPosition]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (isInlineEditing) return; // Don't handle wheel events during inline editing

    if (effectSettings.type === 'text' && effectSettings.textContent && !disabled) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -2 : 2; // Scale down on scroll down, up on scroll up
      const newSize = Math.max(12, Math.min(72, (effectSettings.textFontSize || 24) + delta));
      setEffectSettings(prev => ({
        ...prev,
        textFontSize: newSize,
      }));
    }
  }, [isInlineEditing, effectSettings.type, effectSettings.textContent, effectSettings.textFontSize, disabled, setEffectSettings]);

  // Enhanced touch handlers for text dragging and rotation with throttling
  const handleTouchStartEnhanced = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isInlineEditing) return; // Don't handle touch events during inline editing

    // Handle pinch zoom first
    handleTouchStart(e);

    // Handle text dragging and rotation
    if (effectSettings.type === 'text' && effectSettings.textContent && !disabled) {
      setIsManipulatingText(true);
      if (e.touches.length === 1) {
        // Single touch - drag
        const rect = e.currentTarget.getBoundingClientRect();
        const touch = e.touches[0];
        const x = (touch.clientX - rect.left) / rect.width;
        const y = (touch.clientY - rect.top) / rect.height;

        setIsDraggingText(true);
        setDragStartX(x);
        setDragStartY(y);
        throttledSetDragPosition(x, y);
      } else if (e.touches.length === 2) {
        // Two touches - rotation and scaling
        const rect = e.currentTarget.getBoundingClientRect();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;

        // Store initial rotation and touch angle
        initialRotationRef.current = effectSettings.textRotation || 0;
        initialTouchAngleRef.current = getAngle(
          touch1.clientX - rect.left, touch1.clientY - rect.top,
          touch2.clientX - rect.left, touch2.clientY - rect.top
        );

        // Store initial scale and distance
        initialScaleRef.current = effectSettings.textScale || 1;
        initialDistanceRef.current = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );

        // Also set position to center of rotation
        const x = (centerX - rect.left) / rect.width;
        const y = (centerY - rect.top) / rect.height;
        throttledSetDragPosition(x, y);
      }
    }
  }, [isInlineEditing, effectSettings.type, effectSettings.textContent, effectSettings.textRotation, effectSettings.textScale, disabled, handleTouchStart, setEffectSettings, setIsManipulatingText, setIsDraggingText, setDragStartX, setDragStartY, throttledSetDragPosition, getAngle]);

  const handleTouchMoveEnhanced = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isInlineEditing) return; // Don't handle touch events during inline editing

    // Only handle camera zoom if not manipulating text
    if (!isManipulatingText) {
      handleTouchMove(e);
    }

    // Handle text dragging, rotation, and scaling
    if (effectSettings.type === 'text' && effectSettings.textContent && !disabled && isManipulatingText) {
      if (e.touches.length === 1 && isDraggingText) {
        // Single touch - drag
        const rect = e.currentTarget.getBoundingClientRect();
        const touch = e.touches[0];
        const x = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));

        throttledSetDragPosition(x, y);
      } else if (e.touches.length === 2) {
        // Two touches - rotation and scaling
        const rect = e.currentTarget.getBoundingClientRect();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        // Handle rotation
        const currentAngle = getAngle(
          touch1.clientX - rect.left, touch1.clientY - rect.top,
          touch2.clientX - rect.left, touch2.clientY - rect.top
        );

        const angleDiff = currentAngle - initialTouchAngleRef.current;
        const newRotation = initialRotationRef.current + angleDiff;

        throttledSetRotation(newRotation);

        // Handle scaling
        const currentDistance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );

        const scaleDiff = currentDistance / initialDistanceRef.current;
        const newScale = Math.max(0.1, Math.min(5, initialScaleRef.current * scaleDiff));

        throttledSetScale(newScale);

        // Also update position to center of rotation/scaling
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        const x = Math.max(0, Math.min(1, (centerX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (centerY - rect.top) / rect.height));
        throttledSetDragPosition(x, y);
      }
    }
  }, [isInlineEditing, effectSettings.type, effectSettings.textContent, disabled, handleTouchMove, isDraggingText, isManipulatingText, throttledSetDragPosition, getAngle, throttledSetRotation, throttledSetScale]);

  const handleTouchEndEnhanced = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isInlineEditing) return; // Don't handle touch events during inline editing

    handleTouchEnd(); // Reset pinch distance
    setIsDraggingText(false);
    setIsManipulatingText(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Final update to ensure position, rotation, and scale are set
    if (dragUpdateRef.current || rotationUpdateRef.current !== undefined || scaleUpdateRef.current !== undefined) {
      updateDragPosition();
    }
  }, [isInlineEditing, handleTouchEnd, setIsDraggingText, setIsManipulatingText, updateDragPosition]);

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
      // Clear drag, rotation, and scale state
      dragUpdateRef.current = null;
      rotationUpdateRef.current = undefined;
      scaleUpdateRef.current = undefined;
      initialRotationRef.current = 0;
      initialTouchAngleRef.current = 0;
      initialScaleRef.current = 1;
      initialDistanceRef.current = 0;
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
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
              onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right click
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

            {/* Inline text editing overlay */}
            {isInlineEditing && effectSettings.type === 'text' && effectSettings.textContent && (
              <textarea
                ref={inlineEditRef}
                value={inlineEditText}
                onChange={(e) => handleInlineEditChange(e.target.value)}
                onBlur={handleInlineEditBlur}
                onKeyDown={handleInlineEditKeyDown}
                style={{
                  position: 'absolute',
                  left: `${((effectSettings.textX ?? 0.5) * 100)}%`,
                  top: `${((effectSettings.textY ?? 0.5) * 100)}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${Math.max(100, (effectSettings.textFontSize || 40) * 6)}px`,
                  minHeight: `${Math.max(30, (effectSettings.textFontSize || 40) * 1.2)}px`,
                  fontSize: `${effectSettings.textFontSize || 40}px`,
                  fontFamily: effectSettings.textFontFamily || 'Arial',
                  fontWeight: 'bold',
                  color: effectSettings.textColor || '#ffffff',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.5)',
                  borderRadius: '2px',
                  padding: '2px 4px',
                  resize: 'none',
                  outline: 'none',
                  zIndex: 10,
                  textAlign: effectSettings.textAlign === 'center' ? 'center' : effectSettings.textAlign === 'right' ? 'right' : 'left',
                  lineHeight: effectSettings.textLineHeight || 1.4,
                  whiteSpace: 'pre-wrap',
                  overflow: 'hidden',
                  boxShadow: '0 0 0 1px rgba(0,122,204,0.3)',
                }}
                rows={inlineEditText.split('\n').length}
                placeholder="Edit text..."
              />
            )}

            <CameraControls
              disabled={controlsDisabled}
              cameraReady={cameraReady}
              isCapturing={isCapturing}
              processing={processing}
              zoom={zoom}
              overlayVisible={overlayVisible}
              isSwitchingCamera={isSwitchingCamera}
              switchCamera={switchCamera}
              openFilePicker={openFilePicker}
              setZoom={setZoom}
              handleCapture={handleCapture}
              handleClose={handleClose}
              isPreviewing={isPreviewing}
              confirmCapture={confirmCapture}
              retakeCapture={() => { retakeCapture(); startCameraEnhanced(); startRenderLoop(effectSettings, false, videoRef, streamRef, applyZoom); }}
            />

            {/* Add from files button - always visible in left bottom corner */}
            <button
              onClick={openFilePicker}
              disabled={disabled}
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 4,
              }}
              aria-label="Add from files"
              title="Add image from files"
            >
              <ImagePlus size={16} />
            </button>

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
