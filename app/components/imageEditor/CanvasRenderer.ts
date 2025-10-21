import { DrawParams, LayoutInfo, DrawOverrides } from "./CanvasRendererCore";
import { computeImageLayout, computeFrameAdjustedLayout } from "./CanvasRendererLayout";
import { computeFilterValues } from "./CanvasRendererFilters";
import { applySoftFocusEffect, applyFadeEffect, applyVignetteEffect, applyGrainEffect, applyOverlayEffect } from "./CanvasRendererEffects";
import { drawFrame } from "./CanvasRendererFrame";
import { drawSelection } from "./CanvasRendererSelection";
import { drawRotated } from "./CanvasRendererUtils";
import { generateNoiseCanvas } from "./utils";
import { applyWebGLAdjustments } from './webglFilters';
import { mapBasicAdjustments } from './filterUtils';
import { getTempCanvas, releaseTempCanvas } from './tempCanvasPool';

// Cache for WebGL processed images
const webglCache = new Map<string, HTMLCanvasElement>();

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
    // For export, create full-size layout info with rotation bounding box
    const rot = params.rotationRef.current;
    const angle = (rot * Math.PI) / 180;
    const absCos = Math.abs(Math.cos(angle));
    const absSin = Math.abs(Math.sin(angle));
    const rotatedW = Math.max(1, Math.round(img.naturalWidth * absCos + img.naturalHeight * absSin));
    const rotatedH = Math.max(1, Math.round(img.naturalWidth * absSin + img.naturalHeight * absCos));
    // Set canvas size to bounding box
    targetCanvas.width = rotatedW;
    targetCanvas.height = rotatedH;
    // Center the image in the bounding box
    const centerX = rotatedW / 2;
    const centerY = rotatedH / 2;
    layoutInfo = {
      rect: { width: rotatedW, height: rotatedH, left: 0, top: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect,
      baseScale: 1,
      dispW: img.naturalWidth,
      dispH: img.naturalHeight,
      left: centerX - img.naturalWidth / 2,
      top: centerY - img.naturalHeight / 2
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
        // Create cache key based on image src and adjustments
        const cacheKey = `${params.imgRef.current?.src || ''}_${filterValues.curExposure}_${filterValues.curContrast}_${filterValues.curSaturation}_${filterValues.curTemperature}_${filterValues.curSelectedFilter}_${filterValues.curFilterStrength}`;
        let tmpCanvas = webglCache.get(cacheKey);
        if (!tmpCanvas) {
          // use the computed filter values from computeFilterValues
          const fv: any = filterValues;
          const m = mapBasicAdjustments({ exposure: fv.curExposure, contrast: fv.curContrast, saturation: fv.curSaturation, temperature: fv.curTemperature });
          const brightness = m.brightness || 1;
          const contrast = m.finalContrast || 1;
          const saturation = m.cssSaturation || 1;
          const hueDeg = m.hue || 0;
          const tempTint = (m as any).tempTint || 0;

          tmpCanvas = applyWebGLAdjustments(img, img.naturalWidth, img.naturalHeight, { brightness, contrast, saturation, hue: hueDeg, preset: (filterValues as any).curSelectedFilter, presetStrength: (filterValues as any).curFilterStrength, tempTint }) as HTMLCanvasElement | undefined;
          // Cache the result, but limit cache size
          if (webglCache.size > 10) {
            const firstKey = webglCache.keys().next().value;
            if (firstKey) webglCache.delete(firstKey);
          }
          if (tmpCanvas) webglCache.set(cacheKey, tmpCanvas);
        }
        // draw the processed GPU canvas (snapshot) onto our main canvas, taking rotation into account
        if (tmpCanvas) drawRotated(tmpCanvas, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
        usedGpu = true;
      } catch (e) {
        usedGpu = false;
      }

      if (!usedGpu) {
        // fallback to CPU filter path with full-res temp canvases
        if (curFilterStrength >= 0.999) {
          const temp = getTempCanvas(img.naturalWidth, img.naturalHeight);
          try {
            const tctx = (temp as HTMLCanvasElement).getContext('2d')!;
            tctx.filter = filter;
            tctx.drawImage(img, 0, 0);
            tctx.filter = 'none';
            drawRotated(temp as any, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
          } finally {
            releaseTempCanvas(temp);
          }
        } else if (curFilterStrength <= 0.001) {
          const temp = getTempCanvas(img.naturalWidth, img.naturalHeight);
          try {
            const tctx = (temp as HTMLCanvasElement).getContext('2d')!;
            tctx.filter = baseFilter;
            tctx.drawImage(img, 0, 0);
            tctx.filter = 'none';
            drawRotated(temp as any, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
          } finally {
            releaseTempCanvas(temp);
          }
        } else {
          const tempBase = getTempCanvas(img.naturalWidth, img.naturalHeight);
          const tempFilter = getTempCanvas(img.naturalWidth, img.naturalHeight);
          try {
            const tctxBase = (tempBase as HTMLCanvasElement).getContext('2d')!;
            tctxBase.filter = baseFilter;
            tctxBase.drawImage(img, 0, 0);
            tctxBase.filter = 'none';
            const tctxFilter = (tempFilter as HTMLCanvasElement).getContext('2d')!;
            tctxFilter.filter = filter;
            tctxFilter.drawImage(img, 0, 0);
            tctxFilter.filter = 'none';
            // draw base
            drawRotated(tempBase as any, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
            // composite filtered
            ctx.globalAlpha = Math.min(1, Math.max(0, curFilterStrength));
            drawRotated(tempFilter as any, imgLeft, imgTop, imgW, imgH, angleRad, ctx);
            ctx.globalAlpha = 1;
          } finally {
            releaseTempCanvas(tempBase);
            releaseTempCanvas(tempFilter);
          }
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
