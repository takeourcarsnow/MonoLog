import { useEffect, useRef, useState, useMemo } from "react";
import type { EditorSettings } from "../types";

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
  const [exposure, setExposure] = useState<number>(initialSettings?.exposure ?? 1);
  const [contrast, setContrast] = useState<number>(initialSettings?.contrast ?? 1);
  const [saturation, setSaturation] = useState<number>(initialSettings?.saturation ?? 1);
  const [temperature, setTemperature] = useState<number>(initialSettings?.temperature ?? 0);
  const [vignette, setVignette] = useState<number>(initialSettings?.vignette ?? 0);
  const [frameColor, setFrameColor] = useState<'white' | 'black'>(initialSettings?.frameColor ?? 'white');
  const [frameThickness, setFrameThickness] = useState<number>(initialSettings?.frameThickness ?? 0);
  const [controlsOpen, setControlsOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<'basic' | 'color' | 'effects' | 'crop' | 'frame'>('basic');
  const ASPECT_PRESETS = [
    { label: 'Free', v: null },
    { label: '16:9', v: 16 / 9 },
    { label: '4:3', v: 4 / 3 },
    { label: '3:2', v: 3 / 2 },
    { label: '1:1', v: 1 },
  ];
  const [presetIndex, setPresetIndex] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<string>(initialSettings?.selectedFilter ?? 'none');
  const [filterStrength, setFilterStrength] = useState<number>(initialSettings?.filterStrength ?? 1);
  const [rotation, setRotation] = useState<number>(initialSettings?.rotation ?? 0);
  const [grain, setGrain] = useState<number>(initialSettings?.grain ?? 0);
  const rotationRef = useRef<number>(rotation);
  const [softFocus, setSoftFocus] = useState<number>(initialSettings?.softFocus ?? 0);
  const [fade, setFade] = useState<number>(initialSettings?.fade ?? 0);
  const [matte, setMatte] = useState<number>(initialSettings?.matte ?? 0);

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
  const matteRef = useRef<number>(matte);
  const filtersContainerRef = useRef<HTMLDivElement | null>(null);
  const [filterHighlight, setFilterHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const suppressFilterTransitionRef = useRef<boolean>(false);
  const categoriesContainerRef = useRef<HTMLDivElement | null>(null);
  const [categoryHighlight, setCategoryHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  // animate dashed selection while a selection exists
  const dashOffsetRef = useRef<number>(0);
  const dashAnimRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // default behavior: drag to create/move crop selection.
  const cropRatio = useRef<number | null>(null);

  // Keep refs in sync with state
  useEffect(() => { rotationRef.current = rotation; }, [rotation]);
  useEffect(() => { exposureRef.current = exposure; }, [exposure]);
  useEffect(() => { contrastRef.current = contrast; }, [contrast]);
  useEffect(() => { saturationRef.current = saturation; }, [saturation]);
  useEffect(() => { temperatureRef.current = temperature; }, [temperature]);
  useEffect(() => { vignetteRef.current = vignette; }, [vignette]);
  useEffect(() => { frameColorRef.current = frameColor; }, [frameColor]);
  useEffect(() => { frameThicknessRef.current = frameThickness; }, [frameThickness]);
  useEffect(() => { selectedFilterRef.current = selectedFilter; }, [selectedFilter]);
  useEffect(() => { filterStrengthRef.current = filterStrength; }, [filterStrength]);
  useEffect(() => { grainRef.current = grain; }, [grain]);
  useEffect(() => { softFocusRef.current = softFocus; }, [softFocus]);
  useEffect(() => { fadeRef.current = fade; }, [fade]);
  useEffect(() => { matteRef.current = matte; }, [matte]);
  useEffect(() => { previewOriginalRef.current = previewOriginal; }, [previewOriginal]);

  // quick derived flag: has the user made any edits
  const isEdited = useMemo(() => {
    if (imageSrc !== originalRef.current) return true;
    if (sel) return true;
    if (Math.abs(exposure - 1) > 0.001) return true;
    if (Math.abs(contrast - 1) > 0.001) return true;
    if (Math.abs(saturation - 1) > 0.001) return true;
    if (Math.abs(temperature) > 0.001) return true;
    if (Math.abs(vignette) > 0.001) return true;
    if (Math.abs(rotation) > 0.001) return true;
    if (selectedFilter !== 'none') return true;
    if (Math.abs(grain) > 0.001) return true;
    if (frameThickness > 0) return true;
    return false;
  }, [imageSrc, sel, exposure, contrast, saturation, temperature, vignette, selectedFilter, grain, frameThickness]);

  return {
    // Refs
    canvasRef,
    containerRef,
    imgRef,
    originalImgRef,
    dragging,
    rotationRef,
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
    matteRef,
    filtersContainerRef,
    suppressFilterTransitionRef,
    categoriesContainerRef,
    dashOffsetRef,
    dashAnimRef,
    cropRatio,
    previewPointerIdRef,
    previewOriginalRef,
    originalRef,

    // State
    imageSrc,
    setImageSrc,
    previewOriginal,
    setPreviewOriginal,
    offset,
    setOffset,
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
    softFocus,
    setSoftFocus,
    fade,
    setFade,
    matte,
    setMatte,
    filterHighlight,
    setFilterHighlight,
    categoryHighlight,
    setCategoryHighlight,
    mounted,
    setMounted,

    // Computed
    isEdited,
  };
}