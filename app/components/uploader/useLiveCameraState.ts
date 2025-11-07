"use client";

import { useState, useCallback } from "react";
import { CameraEffectSettings } from "./cameraEffects";

export function useLiveCameraState() {
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
  };
}