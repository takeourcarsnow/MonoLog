import { FILTER_PRESETS } from "./constants";
import { DrawParams, DrawOverrides } from "./CanvasRendererCore";
import { mapBasicAdjustments } from './filterUtils';

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

  const curExposure = isPreviewOrig ? 0 : (overrides?.exposure ?? exposureRef.current ?? 0);
  const curContrast = overrides?.contrast ?? contrastRef.current ?? 0;
  const curSaturation = overrides?.saturation ?? saturationRef.current ?? 0;
  const curTemperature = overrides?.temperature ?? temperatureRef.current ?? 0;
  const curVignette = isPreviewOrig ? 0 : (overrides?.vignette ?? vignetteRef.current ?? 0);
  const curSelectedFilter = isPreviewOrig && !overrides?.selectedFilter ? 'none' : (overrides?.selectedFilter ?? selectedFilterRef.current ?? 'none');
  const curFilterStrength = isPreviewOrig ? 1 : (filterStrengthRef.current ?? 1);
  const curGrain = isPreviewOrig ? 0 : (overrides?.grain ?? grainRef.current ?? 0);
  const curSoftFocus = isPreviewOrig ? 0 : (overrides?.softFocus ?? softFocusRef.current ?? 0);
  const curFade = isPreviewOrig ? 0 : (overrides?.fade ?? fadeRef.current ?? 0);
  const curMatte = isPreviewOrig ? 0 : (overrides?.matte ?? matteRef.current ?? 0);
  // frame is considered "on" when thickness > 0. Allow overrides to pass a thickness.
  const curFrameThickness = overrides?.frameThickness ?? frameThicknessRef.current ?? 0;
  const curFrameEnabled = curFrameThickness > 0;
  const curFrameColor = overrides?.frameColor ?? frameColorRef.current ?? 'white';
  // Invert temperature so slider direction matches warm/cool expectation
  const hue = Math.round((-curTemperature / 100) * 30);

  // map selectedFilter to additional filter fragments
  const preset = FILTER_PRESETS[curSelectedFilter] || '';
  const angle = (overrides?.rotation ?? rotationRef.current ?? 0) || 0;
  const angleRad = (angle * Math.PI) / 180;

  // Use shared mapping helper for consistent/safe mapping of controls -> CSS filter values
  const { baseFilter } = mapBasicAdjustments({ exposure: curExposure, contrast: curContrast, saturation: curSaturation, temperature: curTemperature });
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
