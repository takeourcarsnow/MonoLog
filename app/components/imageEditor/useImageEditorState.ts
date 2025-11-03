import { useRef, useState } from "react";
import type { EditorSettings } from './types';

export function useImageEditorState(initialDataUrl: string, initialSettings?: EditorSettings) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const [imageSrc, setImageSrc] = useState(initialDataUrl);
  const originalRef = useRef<string>(initialDataUrl);
  const [previewOriginal, setPreviewOriginal] = useState(false);
  const previewPointerIdRef = useRef<number | null>(null);
  const previewOriginalRef = useRef<boolean>(false);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef<null | {
    startX: number;
    startY: number;
    mode: "pan" | "crop";
    action?: "move" | "draw" | "resize";
    origSel?: { x: number; y: number; w: number; h: number };
    anchorX?: number;
    anchorY?: number;
    handleIndex?: number;
  }>(null);
  const [sel, setSel] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [exposure, setExposure] = useState<number>(initialSettings?.exposure ?? 0);
  const [contrast, setContrast] = useState<number>(initialSettings?.contrast ?? 0);
  const [saturation, setSaturation] = useState<number>(initialSettings?.saturation ?? 0);
  const [temperature, setTemperature] = useState<number>(initialSettings?.temperature ?? 0); // -100..100 mapped to hue-rotate
  const [vignette, setVignette] = useState<number>(initialSettings?.vignette ?? 0); // 0..1
  const [frameColor, setFrameColor] = useState<'white' | 'black'>(initialSettings?.frameColor ?? 'white');
  const [frameThickness, setFrameThickness] = useState<number>(initialSettings?.frameThickness ?? 0); // fraction of min(image dim) — default disabled
  const [controlsOpen, setControlsOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<'basic' | 'color' | 'effects' | 'special' | 'crop' | 'frame' | 'overlays'>('basic');
  const [previousCategory, setPreviousCategory] = useState<'basic' | 'color' | 'effects' | 'special' | 'crop' | 'frame' | 'overlays'>('basic');
  const ASPECT_PRESETS = [
    { label: 'Free', v: null },
    { label: '16:9', v: 16 / 9 },
    { label: '4:3', v: 4 / 3 },
    { label: '3:2', v: 3 / 2 },
    { label: '1:1', v: 1 },
    // 4:5 removed per request
  ];
  const [presetIndex, setPresetIndex] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<string>(initialSettings?.selectedFilter ?? 'none');
  const [filterStrength, setFilterStrength] = useState<number>(initialSettings?.filterStrength ?? 1); // 0..1
  const [rotation, setRotation] = useState<number>(initialSettings?.rotation ?? 0); // degrees, -180..180
  const [grain, setGrain] = useState<number>(initialSettings?.grain ?? 0); // 0..1
  const rotationRef = useRef<number>(rotation);
  const [softFocus, setSoftFocus] = useState<number>(initialSettings?.softFocus ?? 0); // gentle blur overlay
  const [fade, setFade] = useState<number>(initialSettings?.fade ?? 0); // faded look
  const [overlay, setOverlay] = useState<{ img: HTMLImageElement; blendMode: string; opacity: number } | null>(initialSettings?.overlay ?? null);
  const [frameOverlay, setFrameOverlay] = useState<{ img: HTMLImageElement; opacity: number; bounds?: { minX: number; minY: number; maxX: number; maxY: number } } | null>(initialSettings?.frameOverlay ?? null);
  // Special effects state
  const [ditherMethod, setDitherMethod] = useState<'none' | 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes'>(initialSettings?.ditherMethod ?? 'none');
  const [ditherLevels, setDitherLevels] = useState<number>(initialSettings?.ditherLevels ?? 8);
  const [ditherColorMode, setDitherColorMode] = useState<'bw' | 'color'>(initialSettings?.ditherColorMode ?? 'bw');
  const [ditherPalette, setDitherPalette] = useState<'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii'>(initialSettings?.ditherPalette ?? 'auto');
  const [ditherCustomPalette, setDitherCustomPalette] = useState<string>(initialSettings?.ditherCustomPalette ?? '');
  const [pixelSize, setPixelSize] = useState<number>(initialSettings?.pixelSize ?? 1);
  const [pixelShape, setPixelShape] = useState<'square' | 'circle'>(initialSettings?.pixelShape ?? 'square');
  const [pixelSample, setPixelSample] = useState<'average' | 'nearest'>(initialSettings?.pixelSample ?? 'average');
  const [asciiEnabled, setAsciiEnabled] = useState<boolean>(initialSettings?.asciiEnabled ?? false);
  const [asciiCellSize, setAsciiCellSize] = useState<number>(initialSettings?.asciiCellSize ?? 8);
  const [asciiCharset, setAsciiCharset] = useState<string>(initialSettings?.asciiCharset ?? "@%#*+=-:. ");
  const [asciiInvert, setAsciiInvert] = useState<boolean>(initialSettings?.asciiInvert ?? false);
  const [asciiColor, setAsciiColor] = useState<boolean>(initialSettings?.asciiColor ?? true);
  const [asciiOpacity, setAsciiOpacity] = useState<number>(initialSettings?.asciiOpacity ?? 1);
  const [asciiBackground, setAsciiBackground] = useState<string>(initialSettings?.asciiBackground ?? 'black');
  const [asciiFont, setAsciiFont] = useState<string>(initialSettings?.asciiFont ?? 'monospace');
  const [asciiGamma, setAsciiGamma] = useState<number>(initialSettings?.asciiGamma ?? 1);
  const [asciiBold, setAsciiBold] = useState<boolean>(initialSettings?.asciiBold ?? false);
  const [asciiEdge, setAsciiEdge] = useState<'none' | 'stroke'>(initialSettings?.asciiEdge ?? 'none');
  const [asciiCharsetPreset, setAsciiCharsetPreset] = useState<'custom' | 'dense' | 'medium' | 'sparse' | 'blocks' | 'dots' | 'lines' | 'numbers' | 'letters'>(initialSettings?.asciiCharsetPreset ?? 'custom');
  // refs mirror state for immediate reads inside draw() to avoid stale-state draws
  const exposureRef = useRef<number>(exposure);
  const contrastRef = useRef<number>(contrast);
  const saturationRef = useRef<number>(saturation);
  const temperatureRef = useRef<number>(temperature);
  const vignetteRef = useRef<number>(vignette);
  const frameColorRef = useRef<'white' | 'black'>(frameColor);
  const frameThicknessRef = useRef<number>(frameThickness);
  const selectedFilterRef = useRef<string>(selectedFilter);
  const filterStrengthRef = useRef<number>(filterStrength);
  const grainRef = useRef<number>(grain);
  const softFocusRef = useRef<number>(softFocus);
  const fadeRef = useRef<number>(fade);
  const overlayRef = useRef<{ img: HTMLImageElement; blendMode: string; opacity: number } | null>(overlay);
  const frameOverlayRef = useRef<{ img: HTMLImageElement; opacity: number; bounds?: { minX: number; minY: number; maxX: number; maxY: number } } | null>(frameOverlay);
  // Special effects refs
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
  const filtersContainerRef = useRef<HTMLDivElement | null>(null);
  const [filterHighlight, setFilterHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const suppressFilterTransitionRef = useRef<boolean>(false);
  const categoriesContainerRef = useRef<HTMLDivElement | null>(null);
  const [categoryHighlight, setCategoryHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  // animated dash offset for the selection stroke (marching ants)
  const dashOffsetRef = useRef<number>(0);
  const dashAnimRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  // default behavior: drag to create/move crop selection.
  const cropRatio = useRef<number | null>(null); // null = free
  // default behavior: drag to create/move crop selection.

  return {
    canvasRef,
    containerRef,
    imgRef,
    originalImgRef,
    imageSrc,
    setImageSrc,
    originalRef,
    previewOriginal,
    setPreviewOriginal,
    previewPointerIdRef,
    previewOriginalRef,
    offset,
    setOffset,
    dragging,
    sel,
    setSel,
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
    frameColor,
    setFrameColor,
    frameThickness,
    setFrameThickness,
    controlsOpen,
    setControlsOpen,
    selectedCategory,
    setSelectedCategory,
    previousCategory,
    setPreviousCategory,
    ASPECT_PRESETS,
    presetIndex,
    setPresetIndex,
    selectedFilter,
    setSelectedFilter,
    filterStrength,
    setFilterStrength,
    rotation,
    setRotation,
    grain,
    setGrain,
    rotationRef,
    softFocus,
    setSoftFocus,
    fade,
    setFade,
    overlay,
    setOverlay,
    frameOverlay,
    setFrameOverlay,
    // special effects state
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
    exposureRef,
    contrastRef,
    saturationRef,
    temperatureRef,
    vignetteRef,
    frameColorRef,
    frameThicknessRef,
    selectedFilterRef,
    filterStrengthRef,
    grainRef,
    softFocusRef,
    fadeRef,
    overlayRef,
    frameOverlayRef,
    // special effects refs
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
    filtersContainerRef,
    filterHighlight,
    setFilterHighlight,
    suppressFilterTransitionRef,
    categoriesContainerRef,
    categoryHighlight,
    setCategoryHighlight,
    dashOffsetRef,
    dashAnimRef,
    mounted,
    setMounted,
    cropRatio,
  };
}
