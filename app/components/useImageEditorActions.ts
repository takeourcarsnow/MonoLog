import { useMemo } from 'react';
import { applyEdit as applyEditAction, resetAdjustments as resetAdjustmentsAction, resetControlToDefault as resetControlToDefaultAction, bakeRotate90 as bakeRotate90Action, bakeRotateMinus90 as bakeRotateMinus90Action, applyCropOnly as applyCropOnlyAction, resetCrop as resetCropAction } from './imageEditor/imageEditorActions';

export function useImageEditorActions(
  imgRef: React.RefObject<HTMLImageElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  offset: { x: number; y: number },
  sel: { x: number; y: number; w: number; h: number } | null,
  exposure: number,
  contrast: number,
  saturation: number,
  temperature: number,
  vignette: number,
  frameColor: 'white' | 'black',
  frameThickness: number,
  selectedFilter: string,
  filterStrength: number,
  grain: number,
  softFocus: number,
  fade: number,
  matte: number,
  rotation: number,
  rotationRef: React.MutableRefObject<number>,
  onApply: (dataUrl: string, settings: any) => void,
  setExposure: (value: number) => void,
  exposureRef: React.MutableRefObject<number>,
  setContrast: (value: number) => void,
  contrastRef: React.MutableRefObject<number>,
  setSaturation: (value: number) => void,
  saturationRef: React.MutableRefObject<number>,
  setTemperature: (value: number) => void,
  temperatureRef: React.MutableRefObject<number>,
  setVignette: (value: number) => void,
  vignetteRef: React.MutableRefObject<number>,
  setFrameColor: (value: 'white' | 'black') => void,
  frameColorRef: React.MutableRefObject<'white' | 'black'>,
  setFrameThickness: (value: number) => void,
  frameThicknessRef: React.MutableRefObject<number>,
  setSelectedFilter: (value: string) => void,
  selectedFilterRef: React.MutableRefObject<string>,
  setFilterStrength: (value: number) => void,
  filterStrengthRef: React.MutableRefObject<number>,
  setGrain: (value: number) => void,
  grainRef: React.MutableRefObject<number>,
  setSoftFocus: (value: number) => void,
  softFocusRef: React.MutableRefObject<number>,
  setFade: (value: number) => void,
  fadeRef: React.MutableRefObject<number>,
  setMatte: (value: number) => void,
  matteRef: React.MutableRefObject<number>,
  setRotation: (value: number) => void,
  setSel: (value: { x: number; y: number; w: number; h: number } | null) => void,
  cropRatio: React.MutableRefObject<number | null>,
  setPresetIndex: (value: number) => void,
  draw: () => void,
  imageSrc: string,
  originalRef: React.MutableRefObject<string>,
  setImageSrc: (value: string) => void,
  setOffset: (value: { x: number; y: number }) => void,
  computeImageLayout: () => any,
  dragging: React.MutableRefObject<null | any>,
  previewPointerIdRef: React.MutableRefObject<number | null>,
  previewOriginalRef: React.MutableRefObject<boolean>,
  setPreviewOriginal: (value: boolean) => void,
  setSelectedCategory: (category: 'basic' | 'color' | 'effects' | 'crop' | 'frame') => void,
  previousCategory: 'basic' | 'color' | 'effects' | 'crop' | 'frame'
) {
  // quick derived flag: has the user made any edits (image replaced, selection or adjustments)
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

  // Action wrappers that delegate to the standalone action helpers
  function applyEdit() {
    applyEditAction(
      imgRef,
      canvasRef,
      offset,
      sel,
      exposure,
      contrast,
      saturation,
      temperature,
      vignette,
      frameColor,
      frameThickness,
      selectedFilter,
      filterStrength,
      grain,
      softFocus,
      fade,
      matte,
      rotation,
      rotationRef,
      onApply
    );
  }

  function resetAdjustments() {
    resetAdjustmentsAction(
      setExposure,
      exposureRef,
      setContrast,
      contrastRef,
      setSaturation,
      saturationRef,
      setTemperature,
      temperatureRef,
      setVignette,
      vignetteRef,
      setFrameColor,
      frameColorRef,
      setFrameThickness,
      frameThicknessRef,
      setSelectedFilter,
      selectedFilterRef,
      setFilterStrength,
      filterStrengthRef,
      setGrain,
      grainRef,
      setSoftFocus,
      softFocusRef,
      setFade,
      fadeRef,
      setMatte,
      matteRef,
      setRotation,
      rotationRef,
      setSel,
      cropRatio,
      setPresetIndex
    );
    // ensure canvas redraw after reset
    requestAnimationFrame(() => draw());
  }

  function resetControlToDefault(control: string) {
    resetControlToDefaultAction(
      control,
      exposureRef,
      setExposure,
      contrastRef,
      setContrast,
      saturationRef,
      setSaturation,
      temperatureRef,
      setTemperature,
      filterStrengthRef,
      setFilterStrength,
      vignetteRef,
      setVignette,
      grainRef,
      setGrain,
      softFocusRef,
      setSoftFocus,
      fadeRef,
      setFade,
      matteRef,
      setMatte,
      rotationRef,
      setRotation,
      frameThicknessRef,
      setFrameThickness,
      draw
    );
  }

  async function bakeRotate90() {
    await bakeRotate90Action(imgRef, setImageSrc, setSel, setOffset);
    requestAnimationFrame(() => draw());
  }

  async function bakeRotateMinus90() {
    await bakeRotateMinus90Action(imgRef, setImageSrc, setSel, setOffset);
    requestAnimationFrame(() => draw());
  }

  async function applyCropOnly() {
    await applyCropOnlyAction(
      imgRef,
      canvasRef,
      sel,
      offset,
      rotation,
      rotationRef,
      setImageSrc,
      setSel,
      setOffset,
      setRotation,
      computeImageLayout
    );
    setSelectedCategory(previousCategory);
  }

  function resetCrop() {
    resetCropAction(
      imageSrc,
      originalRef,
      setImageSrc,
      setSel,
      setOffset,
      rotationRef,
      setRotation,
      cropRatio,
      setPresetIndex,
      dragging,
      previewPointerIdRef,
      previewOriginalRef,
      setPreviewOriginal,
      computeImageLayout
    );
  }

  return {
    isEdited,
    applyEdit,
    resetAdjustments,
    resetControlToDefault,
    bakeRotate90,
    bakeRotateMinus90,
    applyCropOnly,
    resetCrop
  };
}
