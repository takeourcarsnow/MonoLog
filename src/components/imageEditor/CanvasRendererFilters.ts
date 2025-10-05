import { FILTER_PRESETS } from "./constants";
import { DrawParams, DrawOverrides } from "./CanvasRendererCore";

export function computeFilterValues(params: DrawParams, overrides?: DrawOverrides) {
  const {
    previewOriginalRef,
    originalImgRef,
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
    rotationRef,
  } = params;

  // Apply color adjustments via canvas filter for live preview
  // If previewOriginal is true we skip all adjustments/filters and draw the raw original image
  const isPreviewOrig = previewOriginalRef.current && originalImgRef.current;

  // temperature mapped to hue-rotate degrees (-30..30 deg)
  const curExposure = isPreviewOrig ? 1 : (overrides?.exposure ?? exposureRef.current ?? 1);
  const curContrast = overrides?.contrast ?? contrastRef.current ?? 1;
  const curSaturation = overrides?.saturation ?? saturationRef.current ?? 1;
  const curTemperature = overrides?.temperature ?? temperatureRef.current ?? 0;
  const curVignette = overrides?.vignette ?? vignetteRef.current ?? 0;
  const curSelectedFilter = overrides?.selectedFilter ?? selectedFilterRef.current ?? 'none';
  const curFilterStrength = filterStrengthRef.current ?? 1;
  const curGrain = overrides?.grain ?? grainRef.current ?? 0;
  const curSoftFocus = overrides?.softFocus ?? softFocusRef.current ?? 0;
  const curFade = overrides?.fade ?? fadeRef.current ?? 0;
  const curMatte = overrides?.matte ?? matteRef.current ?? 0;
  // frame is considered "on" when thickness > 0. Allow overrides to pass a thickness.
  const curFrameThickness = overrides?.frameThickness ?? frameThicknessRef.current ?? 0;
  const curFrameEnabled = curFrameThickness > 0;
  const curFrameColor = overrides?.frameColor ?? frameColorRef.current ?? 'white';
  const hue = Math.round((curTemperature / 100) * 30);

  // map selectedFilter to additional filter fragments
  const preset = FILTER_PRESETS[curSelectedFilter] || '';
  const angle = (overrides?.rotation ?? rotationRef.current ?? 0) || 0;
  const angleRad = (angle * Math.PI) / 180;

  // base color adjustments (exposure/contrast/saturation) + hue
  const baseFilter = `brightness(${curExposure}) contrast(${curContrast}) saturate(${curSaturation}) hue-rotate(${hue}deg)`;
  const filter = `${baseFilter} ${preset}`;

  return {
    isPreviewOrig,
    curExposure,
    curContrast,
    curSaturation,
    curTemperature,
    curVignette,
    curSelectedFilter,
    curFilterStrength,
    curGrain,
    curSoftFocus,
    curFade,
    curMatte,
    curFrameThickness,
    curFrameEnabled,
    curFrameColor,
    hue,
    preset,
    angle,
    angleRad,
    baseFilter,
    filter,
  };
}