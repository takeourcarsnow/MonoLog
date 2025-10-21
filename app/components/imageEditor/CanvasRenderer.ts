import { DrawParams, LayoutInfo, DrawOverrides } from "./CanvasRendererCore";
import { computeImageLayout, computeFrameAdjustedLayout } from "./CanvasRendererLayout";
import { computeFilterValues } from "./CanvasRendererFilters";
import { applySoftFocusEffect, applyFadeEffect, applyVignetteEffect, applyGrainEffect, applyLightLeakEffect, applyOverlayEffect } from "./CanvasRendererEffects";
import { drawFrame } from "./CanvasRendererFrame";
import { drawSelection } from "./CanvasRendererSelection";
import { drawRotated } from "./CanvasRendererUtils";
import { generateNoiseCanvas } from "./utils";
import { applyWebGLAdjustments } from './webglFilters';
import { mapBasicAdjustments } from './filterUtils';

export function draw(params: DrawParams, info?: LayoutInfo, overrides?: DrawOverrides, targetCanvas?: HTMLCanvasElement) {
  const canvas = targetCanvas || params.canvasRef.current;
  const img = params.previewOriginalRef.current && params.originalImgRef.current ? params.originalImgRef.current : params.imgRef.current;
  if (!canvas || !img) return;

  const ctx = canvas.getContext("2d")!;
  const dpr = targetCanvas ? 1 : (window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

  let layoutInfo = info;
  if (targetCanvas && !info) {
    // For export, create full-size layout info
    layoutInfo = {
      rect: { width: canvas.width, height: canvas.height, left: 0, top: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect,
      baseScale: 1,
      dispW: img.naturalWidth,
      dispH: img.naturalHeight,
      left: 0,
      top: 0
    };
  }

  const layout = layoutInfo || computeImageLayout(params, info);
  if (!layout) return;

  const { left, top, dispW, dispH } = layout;
  const filterValues = computeFilterValues(params, overrides);

  const {
    isPreviewOrig,
    curFilterStrength,
    curFrameEnabled,
    curFrameThickness,
    curFrameColor,
    angleRad,
    baseFilter,
    filter,
    preset,
  } = filterValues;

  // Calculate frame-adjusted layout
  const { imgLeft, imgTop, imgW, imgH } = computeFrameAdjustedLayout(
    left,
    top,
    dispW,
    dispH,
    curFrameThickness
  );

  // Draw the main image with filters
  if (isPreviewOrig) {
    // Draw raw original with no filters/effects
    drawRotated(img, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
  } else {
    // Check if all adjustments are at neutral values - if so, draw raw image to avoid GPU processing artifacts
    const hasNeutralAdjustments = 
      Math.abs(filterValues.curExposure) < 0.001 &&
      Math.abs(filterValues.curContrast) < 0.001 &&
      Math.abs(filterValues.curSaturation) < 0.001 &&
      Math.abs(filterValues.curTemperature) < 0.001 &&
      filterValues.curSelectedFilter === 'none' &&
      Math.abs(filterValues.curVignette) < 0.001 &&
      Math.abs(filterValues.curGrain) < 0.001 &&
      Math.abs(filterValues.curSoftFocus) < 0.001 &&
      Math.abs(filterValues.curFade) < 0.001 &&
      (filterValues.curLightLeak.preset === 'none' || !filterValues.curLightLeak.preset) &&
      !curFrameEnabled;

    if (hasNeutralAdjustments) {
      // Draw raw image with no adjustments
      drawRotated(img, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
    } else {
      // Try using GPU shader path for per-pixel accurate and fast adjustments when available.
      // We use WebGL to apply the base adjustments (brightness/contrast/saturation/temperature)
      // and then composite presets/overlays on top if strength < 1.
      let usedGpu = false;
      try {
        // use the computed filter values from computeFilterValues
        const fv: any = filterValues;
  const m = mapBasicAdjustments({ exposure: fv.curExposure, contrast: fv.curContrast, saturation: fv.curSaturation, temperature: fv.curTemperature });
  const brightness = m.brightness || 1;
  const contrast = m.finalContrast || 1;
  const saturation = m.cssSaturation || 1;
  const hueDeg = m.hue || 0;
  const tempTint = (m as any).tempTint || 0;

  const tmpCanvas = applyWebGLAdjustments(img, img.naturalWidth, img.naturalHeight, { brightness, contrast, saturation, hue: hueDeg, preset: (filterValues as any).curSelectedFilter, presetStrength: (filterValues as any).curFilterStrength, tempTint });
        // draw the processed GPU canvas (snapshot) onto our main canvas, taking rotation into account
        drawRotated(tmpCanvas, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
        usedGpu = true;
      } catch (e) {
        usedGpu = false;
      }

      if (!usedGpu) {
        // fallback to CPU filter path with full-res temp canvases
        if (curFilterStrength >= 0.999) {
          const temp = document.createElement('canvas');
          temp.width = img.naturalWidth;
          temp.height = img.naturalHeight;
          const tctx = temp.getContext('2d')!;
          tctx.filter = filter;
          tctx.drawImage(img, 0, 0);
          tctx.filter = 'none';
          drawRotated(temp, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
        } else if (curFilterStrength <= 0.001) {
          const temp = document.createElement('canvas');
          temp.width = img.naturalWidth;
          temp.height = img.naturalHeight;
          const tctx = temp.getContext('2d')!;
          tctx.filter = baseFilter;
          tctx.drawImage(img, 0, 0);
          tctx.filter = 'none';
          drawRotated(temp, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
        } else {
          const tempBase = document.createElement('canvas');
          tempBase.width = img.naturalWidth;
          tempBase.height = img.naturalHeight;
          const tctxBase = tempBase.getContext('2d')!;
          tctxBase.filter = baseFilter;
          tctxBase.drawImage(img, 0, 0);
          tctxBase.filter = 'none';
          const tempFilter = document.createElement('canvas');
          tempFilter.width = img.naturalWidth;
          tempFilter.height = img.naturalHeight;
          const tctxFilter = tempFilter.getContext('2d')!;
          tctxFilter.filter = filter;
          tctxFilter.drawImage(img, 0, 0);
          tctxFilter.filter = 'none';
          // draw base
          drawRotated(tempBase, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
          // composite filtered
          ctx.globalAlpha = Math.min(1, Math.max(0, curFilterStrength));
          drawRotated(tempFilter, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  // Apply special effects (only when not at neutral)
  if (filterValues.curSoftFocus > 0.001) {
    applySoftFocusEffect(ctx, img, imgLeft, imgTop, imgW, imgH, angleRad, filterValues.curSoftFocus);
  }
  if (filterValues.curFade > 0.001) {
    applyFadeEffect(ctx, imgLeft, imgTop, imgW, imgH, filterValues.curFade);
  }
  if (filterValues.curVignette > 0.001) {
    applyVignetteEffect(ctx, canvas, imgLeft, imgTop, imgW, imgH, filterValues.curVignette, info);
  }
  if (filterValues.curGrain > 0.001) {
    applyGrainEffect(ctx, imgLeft, imgTop, imgW, imgH, angleRad, filterValues.curGrain, generateNoiseCanvas);
  }
  if (params.overlayRef.current) {
    try {
      // Debug: log overlay info to help trace rendering issues
      // eslint-disable-next-line no-console
      console.debug('[CanvasRenderer] applying overlay', params.overlayRef.current, { imgLeft, imgTop, imgW, imgH });
    } catch (e) {}
    applyOverlayEffect(ctx, params.overlayRef.current, imgLeft, imgTop, imgW, imgH);
  }

  // Draw frame if enabled
  if (curFrameEnabled) {
    drawFrame(ctx, left, top, dispW, dispH, imgLeft, imgTop, imgW, imgH, angleRad, curFrameColor);
  }

  // Draw selection if present
  if (params.sel) {
    drawSelection(ctx, canvas, params.sel, params.dashOffsetRef.current, dpr);
  }
}
