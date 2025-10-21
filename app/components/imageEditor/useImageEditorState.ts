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
  const [selectedCategory, setSelectedCategory] = useState<'basic' | 'color' | 'effects' | 'crop' | 'frame' | 'lightleak' | 'overlays'>('basic');
  const [previousCategory, setPreviousCategory] = useState<'basic' | 'color' | 'effects' | 'crop' | 'frame' | 'lightleak' | 'overlays'>('basic');
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
  const [lightLeak, setLightLeak] = useState<{ preset: string; intensity: number }>(initialSettings?.lightLeak ?? { preset: 'none', intensity: 0.6 }); // light leak preset and intensity
  const [overlay, setOverlay] = useState<{ img: HTMLImageElement; blendMode: string; opacity: number } | null>(initialSettings?.overlay ?? null);
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
  const lightLeakRef = useRef<{ preset: string; intensity: number }>(lightLeak);
  const overlayRef = useRef<{ img: HTMLImageElement; blendMode: string; opacity: number } | null>(overlay);
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
    lightLeak,
    setLightLeak,
    overlay,
    setOverlay,
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
    lightLeakRef,
    overlayRef,
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
