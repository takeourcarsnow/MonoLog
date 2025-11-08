"use client";

import { useRef, useState } from "react";
import type { EditorSettings } from "../imageEditor/types";

interface UseEffectSettingsOptions {
  initialSettings?: Partial<EditorSettings>;
  enableCrop?: boolean;
  enableRotation?: boolean;
  enableFrameColor?: boolean;
  enableFrameThickness?: boolean;
}

export function useEffectSettings(options: UseEffectSettingsOptions = {}) {
  const {
    initialSettings = {},
    enableCrop = false,
    enableRotation = false,
    enableFrameColor = false,
    enableFrameThickness = false,
  } = options;

  // Basic adjustments
  const [exposure, setExposure] = useState<number>(initialSettings.exposure ?? 0);
  const [contrast, setContrast] = useState<number>(initialSettings.contrast ?? 0);
  const [saturation, setSaturation] = useState<number>(initialSettings.saturation ?? 0);
  const [temperature, setTemperature] = useState<number>(initialSettings.temperature ?? 0);
  const [vignette, setVignette] = useState<number>(initialSettings.vignette ?? 0);

  // Filters
  const [selectedFilter, setSelectedFilter] = useState<string>(initialSettings.selectedFilter ?? 'none');
  const [filterStrength, setFilterStrength] = useState<number>(initialSettings.filterStrength ?? 1);

  // Effects
  const [grain, setGrain] = useState<number>(initialSettings.grain ?? 0);
  const [softFocus, setSoftFocus] = useState<number>(initialSettings.softFocus ?? 0);
  const [fade, setFade] = useState<number>(initialSettings.fade ?? 0);

  // Overlays
  const [overlay, setOverlay] = useState<{ img: HTMLImageElement; blendMode: string; opacity: number } | undefined>(initialSettings.overlay);
  const [frameOverlay, setFrameOverlay] = useState<{ img: HTMLImageElement; opacity: number; bounds?: { minX: number; minY: number; maxX: number; maxY: number } } | undefined>(initialSettings.frameOverlay);

  // Special effects
  const [ditherMethod, setDitherMethod] = useState<'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes'>(initialSettings.ditherMethod ?? 'none');
  const [ditherLevels, setDitherLevels] = useState<number>(initialSettings.ditherLevels ?? 8);
  const [ditherColorMode, setDitherColorMode] = useState<'bw' | 'color'>(initialSettings.ditherColorMode ?? 'bw');
  const [ditherPalette, setDitherPalette] = useState<'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii'>(initialSettings.ditherPalette ?? 'auto');
  const [ditherCustomPalette, setDitherCustomPalette] = useState<string>(initialSettings.ditherCustomPalette ?? '');
  const [pixelSize, setPixelSize] = useState<number>(initialSettings.pixelSize ?? 1);
  const [pixelShape, setPixelShape] = useState<'square' | 'circle'>(initialSettings.pixelShape ?? 'square');
  const [pixelSample, setPixelSample] = useState<'average' | 'nearest'>(initialSettings.pixelSample ?? 'average');
  const [asciiEnabled, setAsciiEnabled] = useState<boolean>(initialSettings.asciiEnabled ?? false);
  const [asciiCellSize, setAsciiCellSize] = useState<number>(initialSettings.asciiCellSize ?? 8);
  const [asciiCharset, setAsciiCharset] = useState<string>(initialSettings.asciiCharset ?? "@%#*+=-:. ");
  const [asciiInvert, setAsciiInvert] = useState<boolean>(initialSettings.asciiInvert ?? false);
  const [asciiColor, setAsciiColor] = useState<boolean>(initialSettings.asciiColor ?? true);
  const [asciiOpacity, setAsciiOpacity] = useState<number>(initialSettings.asciiOpacity ?? 1);
  const [asciiBackground, setAsciiBackground] = useState<string>(initialSettings.asciiBackground ?? 'black');
  const [asciiFont, setAsciiFont] = useState<string>(initialSettings.asciiFont ?? 'monospace');
  const [asciiGamma, setAsciiGamma] = useState<number>(initialSettings.asciiGamma ?? 1);
  const [asciiBold, setAsciiBold] = useState<boolean>(initialSettings.asciiBold ?? false);
  const [asciiEdge, setAsciiEdge] = useState<'none' | 'stroke'>(initialSettings.asciiEdge ?? 'none');
  const [asciiCharsetPreset, setAsciiCharsetPreset] = useState<'custom' | 'dense' | 'medium' | 'sparse' | 'blocks' | 'dots' | 'lines' | 'numbers' | 'letters'>(initialSettings.asciiCharsetPreset ?? 'custom');

  // Optional features
  const [rotation, setRotation] = useState<number>(enableRotation ? (initialSettings.rotation ?? 0) : 0);
  const [frameColor, setFrameColor] = useState<'white' | 'black'>(enableFrameColor ? (initialSettings.frameColor ?? 'white') : 'white');
  const [frameThickness, setFrameThickness] = useState<number>(enableFrameThickness ? (initialSettings.frameThickness ?? 0) : 0);

  // Refs for immediate access
  const exposureRef = useRef<number>(exposure);
  const contrastRef = useRef<number>(contrast);
  const saturationRef = useRef<number>(saturation);
  const temperatureRef = useRef<number>(temperature);
  const vignetteRef = useRef<number>(vignette);
  const selectedFilterRef = useRef<string>(selectedFilter);
  const filterStrengthRef = useRef<number>(filterStrength);
  const grainRef = useRef<number>(grain);
  const softFocusRef = useRef<number>(softFocus);
  const fadeRef = useRef<number>(fade);
  const overlayRef = useRef<{ img: HTMLImageElement; blendMode: string; opacity: number } | undefined>(overlay);
  const frameOverlayRef = useRef<{ img: HTMLImageElement; opacity: number; bounds?: { minX: number; minY: number; maxX: number; maxY: number } } | undefined>(frameOverlay);
  const ditherMethodRef = useRef<'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes'>(ditherMethod);
  const ditherLevelsRef = useRef<number>(ditherLevels);
  const ditherColorModeRef = useRef<'bw' | 'color'>(ditherColorMode);
  const ditherPaletteRef = useRef<'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii'>(ditherPalette);
  const ditherCustomPaletteRef = useRef<string>(ditherCustomPalette);
  const pixelSizeRef = useRef<number>(pixelSize);
  const pixelShapeRef = useRef<'square' | 'circle'>(pixelShape);
  const pixelSampleRef = useRef<'average' | 'nearest'>(pixelSample);
  const asciiEnabledRef = useRef<boolean>(asciiEnabled);
  const asciiCellSizeRef = useRef<number>(asciiCellSize);
  const asciiCharsetRef = useRef<string>(asciiCharset);
  const asciiInvertRef = useRef<boolean>(asciiInvert);
  const asciiColorRef = useRef<boolean>(asciiColor);
  const asciiOpacityRef = useRef<number>(asciiOpacity);
  const asciiBackgroundRef = useRef<string>(asciiBackground);
  const asciiFontRef = useRef<string>(asciiFont);
  const asciiGammaRef = useRef<number>(asciiGamma);
  const asciiBoldRef = useRef<boolean>(asciiBold);
  const asciiEdgeRef = useRef<'none' | 'stroke'>(asciiEdge);
  const rotationRef = useRef<number>(rotation);
  const frameColorRef = useRef<'white' | 'black'>(frameColor);
  const frameThicknessRef = useRef<number>(frameThickness);

  // Update refs when state changes
  exposureRef.current = exposure;
  contrastRef.current = contrast;
  saturationRef.current = saturation;
  temperatureRef.current = temperature;
  vignetteRef.current = vignette;
  selectedFilterRef.current = selectedFilter;
  filterStrengthRef.current = filterStrength;
  grainRef.current = grain;
  softFocusRef.current = softFocus;
  fadeRef.current = fade;
  overlayRef.current = overlay;
  frameOverlayRef.current = frameOverlay;
  ditherMethodRef.current = ditherMethod;
  ditherLevelsRef.current = ditherLevels;
  ditherColorModeRef.current = ditherColorMode;
  ditherPaletteRef.current = ditherPalette;
  ditherCustomPaletteRef.current = ditherCustomPalette;
  pixelSizeRef.current = pixelSize;
  pixelShapeRef.current = pixelShape;
  pixelSampleRef.current = pixelSample;
  asciiEnabledRef.current = asciiEnabled;
  asciiCellSizeRef.current = asciiCellSize;
  asciiCharsetRef.current = asciiCharset;
  asciiInvertRef.current = asciiInvert;
  asciiColorRef.current = asciiColor;
  asciiOpacityRef.current = asciiOpacity;
  asciiBackgroundRef.current = asciiBackground;
  asciiFontRef.current = asciiFont;
  asciiGammaRef.current = asciiGamma;
  asciiBoldRef.current = asciiBold;
  asciiEdgeRef.current = asciiEdge;
  rotationRef.current = rotation;
  frameColorRef.current = frameColor;
  frameThicknessRef.current = frameThickness;

  // Get current settings as EditorSettings
  const getCurrentSettings = (): EditorSettings => ({
    exposure,
    contrast,
    saturation,
    temperature,
    vignette,
    selectedFilter,
    filterStrength,
    grain,
    softFocus,
    fade,
    overlay,
    frameOverlay,
    ditherMethod,
    ditherLevels,
    ditherColorMode,
    ditherPalette,
    ditherCustomPalette,
    pixelSize,
    pixelShape,
    pixelSample,
    asciiEnabled,
    asciiCellSize,
    asciiCharset,
    asciiInvert,
    asciiColor,
    asciiOpacity,
    asciiBackground,
    asciiFont,
    asciiGamma,
    asciiBold,
    asciiEdge,
    asciiCharsetPreset,
    ...(enableRotation && { rotation }),
    ...(enableFrameColor && { frameColor }),
    ...(enableFrameThickness && { frameThickness }),
  });

  // Update multiple settings at once
  const updateSettings = (updates: Partial<EditorSettings>) => {
    if (updates.exposure !== undefined) setExposure(updates.exposure);
    if (updates.contrast !== undefined) setContrast(updates.contrast);
    if (updates.saturation !== undefined) setSaturation(updates.saturation);
    if (updates.temperature !== undefined) setTemperature(updates.temperature);
    if (updates.vignette !== undefined) setVignette(updates.vignette);
    if (updates.selectedFilter !== undefined) setSelectedFilter(updates.selectedFilter);
    if (updates.filterStrength !== undefined) setFilterStrength(updates.filterStrength);
    if (updates.grain !== undefined) setGrain(updates.grain);
    if (updates.softFocus !== undefined) setSoftFocus(updates.softFocus);
    if (updates.fade !== undefined) setFade(updates.fade);
    if (updates.overlay !== undefined) setOverlay(updates.overlay);
    if (updates.frameOverlay !== undefined) setFrameOverlay(updates.frameOverlay);
    if (updates.ditherMethod !== undefined) setDitherMethod(updates.ditherMethod);
    if (updates.ditherLevels !== undefined) setDitherLevels(updates.ditherLevels);
    if (updates.ditherColorMode !== undefined) setDitherColorMode(updates.ditherColorMode);
    if (updates.ditherPalette !== undefined) setDitherPalette(updates.ditherPalette);
    if (updates.ditherCustomPalette !== undefined) setDitherCustomPalette(updates.ditherCustomPalette);
    if (updates.pixelSize !== undefined) setPixelSize(updates.pixelSize);
    if (updates.pixelShape !== undefined) setPixelShape(updates.pixelShape);
    if (updates.pixelSample !== undefined) setPixelSample(updates.pixelSample);
    if (updates.asciiEnabled !== undefined) setAsciiEnabled(updates.asciiEnabled);
    if (updates.asciiCellSize !== undefined) setAsciiCellSize(updates.asciiCellSize);
    if (updates.asciiCharset !== undefined) setAsciiCharset(updates.asciiCharset);
    if (updates.asciiInvert !== undefined) setAsciiInvert(updates.asciiInvert);
    if (updates.asciiColor !== undefined) setAsciiColor(updates.asciiColor);
    if (updates.asciiOpacity !== undefined) setAsciiOpacity(updates.asciiOpacity);
    if (updates.asciiBackground !== undefined) setAsciiBackground(updates.asciiBackground);
    if (updates.asciiFont !== undefined) setAsciiFont(updates.asciiFont);
    if (updates.asciiGamma !== undefined) setAsciiGamma(updates.asciiGamma);
    if (updates.asciiBold !== undefined) setAsciiBold(updates.asciiBold);
    if (updates.asciiEdge !== undefined) setAsciiEdge(updates.asciiEdge);
    if (updates.asciiCharsetPreset !== undefined) setAsciiCharsetPreset(updates.asciiCharsetPreset);
    if (enableRotation && updates.rotation !== undefined) setRotation(updates.rotation);
    if (enableFrameColor && updates.frameColor !== undefined) setFrameColor(updates.frameColor);
    if (enableFrameThickness && updates.frameThickness !== undefined) setFrameThickness(updates.frameThickness);
  };

  return {
    // State
    exposure,
    setExposure,
    contrast,
    setContrast,
    saturation,
    setSaturation,
    temperature,
    setTemperature,
    vignette,
    setVignette,
    selectedFilter,
    setSelectedFilter,
    filterStrength,
    setFilterStrength,
    grain,
    setGrain,
    softFocus,
    setSoftFocus,
    fade,
    setFade,
    overlay,
    setOverlay,
    frameOverlay,
    setFrameOverlay,
    ditherMethod,
    setDitherMethod,
    ditherLevels,
    setDitherLevels,
    ditherColorMode,
    setDitherColorMode,
    ditherPalette,
    setDitherPalette,
    ditherCustomPalette,
    setDitherCustomPalette,
    pixelSize,
    setPixelSize,
    pixelShape,
    setPixelShape,
    pixelSample,
    setPixelSample,
    asciiEnabled,
    setAsciiEnabled,
    asciiCellSize,
    setAsciiCellSize,
    asciiCharset,
    setAsciiCharset,
    asciiInvert,
    setAsciiInvert,
    asciiColor,
    setAsciiColor,
    asciiOpacity,
    setAsciiOpacity,
    asciiBackground,
    setAsciiBackground,
    asciiFont,
    setAsciiFont,
    asciiGamma,
    setAsciiGamma,
    asciiBold,
    setAsciiBold,
    asciiEdge,
    setAsciiEdge,
    asciiCharsetPreset,
    setAsciiCharsetPreset,
    rotation,
    setRotation,
    frameColor,
    setFrameColor,
    frameThickness,
    setFrameThickness,

    // Refs
    exposureRef,
    contrastRef,
    saturationRef,
    temperatureRef,
    vignetteRef,
    selectedFilterRef,
    filterStrengthRef,
    grainRef,
    softFocusRef,
    fadeRef,
    overlayRef,
    frameOverlayRef,
    ditherMethodRef,
    ditherLevelsRef,
    ditherColorModeRef,
    ditherPaletteRef,
    ditherCustomPaletteRef,
    pixelSizeRef,
    pixelShapeRef,
    pixelSampleRef,
    asciiEnabledRef,
    asciiCellSizeRef,
    asciiCharsetRef,
    asciiInvertRef,
    asciiColorRef,
    asciiOpacityRef,
    asciiBackgroundRef,
    asciiFontRef,
    asciiGammaRef,
    asciiBoldRef,
    asciiEdgeRef,
    rotationRef,
    frameColorRef,
    frameThicknessRef,

    // Utilities
    getCurrentSettings,
    updateSettings,
  };
}