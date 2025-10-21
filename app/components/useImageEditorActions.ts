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
  overlay: { img: HTMLImageElement; blendMode: string; opacity: number } | null,
  setOverlay: (v: { img: HTMLImageElement; blendMode: string; opacity: number } | null) => void,
  overlayRef: React.MutableRefObject<{ img: HTMLImageElement; blendMode: string; opacity: number } | null>,
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
  setSelectedCategory: (category: 'basic' | 'color' | 'effects' | 'crop' | 'frame' | 'overlays') => void,
  previousCategory: 'basic' | 'color' | 'effects' | 'crop' | 'frame' | 'overlays'
) {
  // quick derived flag: has the user made any edits (image replaced, selection or adjustments)
  const isEdited = useMemo(() => {
    const checks = [
      imageSrc !== originalRef.current,
      !!sel,
      Math.abs(exposure) > 0.001,
      Math.abs(contrast) > 0.001,
      Math.abs(saturation) > 0.001,
      Math.abs(temperature) > 0.001,
      Math.abs(vignette) > 0.001,
      Math.abs(rotation) > 0.001,
      selectedFilter !== 'none',
      Math.abs(filterStrength - 1) > 0.001,
      Math.abs(grain) > 0.001,
      frameThickness > 0,
      !!overlay,
    ];
    return checks.some(Boolean);
  }, [imageSrc, sel, exposure, contrast, saturation, temperature, vignette, selectedFilter, filterStrength, grain, frameThickness, originalRef, rotation, overlay]);

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
      setOverlay,
      overlayRef,
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
      setRotation,
      rotationRef,
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
