import { DrawParams, LayoutInfo, DrawOverrides } from "./CanvasRendererCore";
import { computeImageLayout, computeFrameAdjustedLayout } from "./CanvasRendererLayout";
import { computeFilterValues } from "./CanvasRendererFilters";
import { applySoftFocusEffect, applyFadeEffect, applyVignetteEffect, applyGrainEffect } from "./CanvasRendererEffects";
import { drawFrame } from "./CanvasRendererFrame";
import { drawSelection } from "./CanvasRendererSelection";
import { drawRotated } from "./CanvasRendererUtils";
import { generateNoiseCanvas } from "./utils";
import { applyWebGLAdjustments } from './webglFilters';
import { mapBasicAdjustments } from './filterUtils';

export function draw(params: DrawParams, info?: LayoutInfo, overrides?: DrawOverrides) {
  const canvas = params.canvasRef.current;
  const img = params.previewOriginalRef.current && params.originalImgRef.current ? params.originalImgRef.current : params.imgRef.current;
  if (!canvas || !img) return;

  const ctx = canvas.getContext("2d")!;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

  const layout = computeImageLayout(params, info);
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

      const tmpCanvas = applyWebGLAdjustments(img, imgW, imgH, { brightness, contrast, saturation, hue: hueDeg, preset: (filterValues as any).curSelectedFilter, presetStrength: (filterValues as any).curFilterStrength });
      // draw the processed GPU canvas (snapshot) onto our main canvas, taking rotation into account
      drawRotated(tmpCanvas, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
      usedGpu = true;
    } catch (e) {
      usedGpu = false;
    }

    if (!usedGpu) {
      // fallback to existing CSS filter path and preset blending
      if (curFilterStrength >= 0.999) {
        ctx.filter = filter;
        drawRotated(img, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
        ctx.filter = 'none';
      } else if (curFilterStrength <= 0.001) {
        ctx.filter = baseFilter;
        drawRotated(img, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
        ctx.filter = 'none';
      } else {
        // draw base with baseFilter, then composite filtered version on top with globalAlpha = strength
        ctx.filter = baseFilter;
        drawRotated(img, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
        ctx.filter = filter;
        ctx.globalAlpha = Math.min(1, Math.max(0, curFilterStrength));
        drawRotated(img, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
        ctx.globalAlpha = 1;
        ctx.filter = 'none';
      }
    }
  }

  // Apply special effects
  applySoftFocusEffect(ctx, img, imgLeft, imgTop, imgW, imgH, angleRad, filterValues.curSoftFocus);
  applyFadeEffect(ctx, imgLeft, imgTop, imgW, imgH, filterValues.curFade);
  applyVignetteEffect(ctx, canvas, imgLeft, imgTop, imgW, imgH, filterValues.curVignette, info);
  applyGrainEffect(ctx, imgLeft, imgTop, imgW, imgH, angleRad, filterValues.curGrain, generateNoiseCanvas);

  // Draw frame if enabled
  if (curFrameEnabled) {
    drawFrame(ctx, left, top, dispW, dispH, imgLeft, imgTop, imgW, imgH, angleRad, curFrameColor);
  }

  // Draw selection if present
  if (params.sel) {
    drawSelection(ctx, canvas, params.sel, params.dashOffsetRef.current, dpr);
  }
}
