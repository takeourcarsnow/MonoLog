import { DrawParams } from "./CanvasRendererCore";
import { computeFilterValues } from "./CanvasRendererFilters";
import { drawRotated } from "./CanvasRendererUtils";
import { applyWebGLAdjustments } from './webglFilters';
import { mapBasicAdjustments } from './filterUtils';
import { getTempCanvas, releaseTempCanvas } from './tempCanvasPool';
import { webglCache } from './CanvasRendererCache';

export function drawImageWithFilters(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  img: HTMLImageElement,
  imgLeft: number,
  imgTop: number,
  imgW: number,
  imgH: number,
  angleRad: number,
  filterValues: any
) {
  const {
    isPreviewOrig,
    curFilterStrength,
    baseFilter,
    filter,
  } = filterValues;

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
      !filterValues.curFrameEnabled;

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
}