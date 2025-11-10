"use client";

import { useState, useCallback } from "react";
import { CameraEffectSettings } from "./cameraEffects";

export const DEFAULT_EFFECT_SETTINGS: CameraEffectSettings = {
  type: 'none',
    // Basic adjustments
  exposure: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  vignette: 0,
    // Filters
  selectedFilter: 'none',
  filterStrength: 1,
    // Effects
  grain: 0,
  softFocus: 0,
  fade: 0,
    // Pixelate settings
  pixelSize: 10,
  pixelShape: 'square',
  pixelSample: 'average',
    // Dither settings
  ditherMethod: 'ordered',
  ditherLevels: 3,
  ditherColorMode: 'bw',
  ditherPalette: 'auto',
  ditherCustomPalette: '',
  targetLongEdge: 150,
    // ASCII settings
  asciiEnabled: false,
  asciiCellSize: 10,
  asciiCharset: ' .:-=+*#%@',
  asciiInvert: false,
  asciiColor: true,
  asciiOpacity: 1,
  asciiBackground: 'transparent',
  asciiFont: 'monospace',
  asciiGamma: 1,
  asciiBold: false,
  asciiEdge: 'none',
  asciiCharsetPreset: 'custom',
  frameOverlay: null,
  overlay: null,
    // Text settings - default to enabled and bold
  textEnabled: true,
  textContent: '',
  textFontSize: 40,
  textFontFamily: 'Roboto',
  textColor: '#ffffff',
  textBold: true,
  textShadow: true,
  textAlign: 'center',
  textPosition: 'center',
  textX: undefined,
  textY: undefined,
  textOpacity: 1,
  textRotation: 0,
  textScale: 1,
  textLineHeight: 1.4,
  textStroke: false,
  textStrokeColor: '#000000',
  textStrokeWidth: 2,
};

export function useLiveCameraState() {
  const [effectSettings, setEffectSettings] = useState<CameraEffectSettings>(DEFAULT_EFFECT_SETTINGS);

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

  // Text dragging state
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);

  // Text manipulation state (for preventing camera zoom during text interaction)
  const [isManipulatingText, setIsManipulatingText] = useState(false);

  return {
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
  };
}