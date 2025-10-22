import { DrawParams, LayoutInfo, DrawOverrides } from "./CanvasRendererCore";
import { computeImageLayout, computeFrameAdjustedLayout } from "./CanvasRendererLayout";
import { computeFilterValues } from "./CanvasRendererFilters";
import { applySoftFocusEffect, applyFadeEffect, applyVignetteEffect, applyGrainEffect, applyOverlayEffect, applyFrameOverlayEffect } from "./CanvasRendererEffects";
import { drawFrame } from "./CanvasRendererFrame";
import { drawSelection } from "./CanvasRendererSelection";
import { drawRotated } from "./CanvasRendererUtils";
import { generateNoiseCanvas } from "./utils";
import { applyWebGLAdjustments } from './webglFilters';
import { mapBasicAdjustments } from './filterUtils';
import { getTempCanvas, releaseTempCanvas } from './tempCanvasPool';

// Cache for WebGL processed images
const webglCache = new Map<string, HTMLCanvasElement>();

// Cache for processed inner masks
const frameInnerMaskCache = new Map<string, HTMLCanvasElement>();

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
  let { imgLeft, imgTop, imgW, imgH } = computeFrameAdjustedLayout(
    left,
    top,
    dispW,
    dispH,
    curFrameThickness
  );

  // If frame overlay is active, make the photo fill the frame's bounding box
  if (params.frameOverlayRef?.current) {
    const frameImg = params.frameOverlayRef.current.img;
    if (frameImg && frameImg.complete) {
      const frameW = frameImg.naturalWidth;
      const frameH = frameImg.naturalHeight;
      const scale = Math.min(dispW / frameW, dispH / frameH);
      const drawW = frameW * scale;
      const drawH = frameH * scale;
      const drawX = left + (dispW - drawW) / 2;
      const drawY = top + (dispH - drawH) / 2;
      imgLeft = drawX;
      imgTop = drawY;
      imgW = drawW;
      imgH = drawH;
    }
  }

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
  // If a frame overlay is active, first remove (mask out) any photo pixels
  // that fall under the opaque parts of the frame image. We use
  // 'destination-out' so drawing the frame image will erase underlying
  // photo pixels where the frame is opaque. After masking we draw the
  // frame normally on top so the frame artwork remains visible.
  if (params.frameOverlayRef?.current) {
    const fo = params.frameOverlayRef.current;
    try {
      const frameImg = fo.img;
      if (frameImg && frameImg.complete) {
        const frameW = frameImg.naturalWidth;
        const frameH = frameImg.naturalHeight;
        // scale frame to fit inside display rect (keeps same sizing as draw)
        const scale = Math.min(dispW / frameW, dispH / frameH);
        const drawW = frameW * scale;
        const drawH = frameH * scale;
        const drawX = left + (dispW - drawW) / 2;
        const drawY = top + (dispH - drawH) / 2;

        // Copy the currently-drawn photo (and any above-photo effects) into a temp canvas
        // in device pixels so we can mask it reliably.
        const photoTmp = document.createElement('canvas');
        photoTmp.width = canvas.width; photoTmp.height = canvas.height;
        const pctx = photoTmp.getContext('2d')!;
        // draw current main canvas content into photoTmp (device pixels)
        pctx.drawImage(canvas, 0, 0);

        const cacheKey = frameImg.src;
        let innerMask = frameInnerMaskCache.get(cacheKey);
        if (!innerMask) {
          // Create a temp canvas for the frame to binarize alpha (ignore small transparencies)
          const frameTemp = document.createElement('canvas');
          frameTemp.width = frameW;
          frameTemp.height = frameH;
          const fctx = frameTemp.getContext('2d')!;
          fctx.drawImage(frameImg, 0, 0);
          const frameData = fctx.getImageData(0, 0, frameW, frameH);
          const data = frameData.data;

          // Flood fill from borders to mark outside transparent areas.
          // We treat very-low-alpha pixels as transparent for the purposes
          // of detecting 'outside' so tiny semi-transparent edge artifacts
          // don't allow the photo to leak through.
          const ALPHA_THRESHOLD = 16; // pixels with alpha <= this are treated as transparent
          const visited = new Uint8Array(frameW * frameH);
          const stack: number[] = [];
          // Add border pixels (push x then y)
          for (let x = 0; x < frameW; x++) {
            stack.push(x, 0);
            stack.push(x, frameH - 1);
          }
          for (let y = 1; y < frameH - 1; y++) {
            stack.push(0, y);
            stack.push(frameW - 1, y);
          }
          while (stack.length > 0) {
            // Pop in reverse order of push: y then x
            const y = stack.pop()!;
            const x = stack.pop()!;
            if (x === undefined || y === undefined) continue;
            if (x < 0 || x >= frameW || y < 0 || y >= frameH) continue;
            const idx = y * frameW + x;
            if (visited[idx]) continue;
            const alpha = data[(idx * 4) + 3];
            // Treat very-low alpha as transparent for flood-fill
            const isTransparent = alpha <= ALPHA_THRESHOLD;
            if (isTransparent) {
              visited[idx] = 1; // mark as outside-transparent
              // visit neighbors
              if (x > 0) stack.push(x - 1, y);
              if (x < frameW - 1) stack.push(x + 1, y);
              if (y > 0) stack.push(x, y - 1);
              if (y < frameH - 1) stack.push(x, y + 1);
            }
          }

          // Now, for each pixel:
          // - if it's outside (visited) -> ensure fully transparent (alpha = 0)
          // - else if it has any alpha > 0 -> make it fully opaque (alpha = 255)
          // - else leave it as transparent (this preserves the large inner hole for the photo)
          for (let i = 0; i < data.length; i += 4) {
            const idx = i / 4;
            const alpha = data[i + 3];
            const isOutside = visited[idx] === 1;
            if (isOutside) {
              data[i + 3] = 0; // outside -> transparent
            } else if (alpha > 0) {
              // Non-outside pixels with any alpha become fully opaque (fills small gaps)
              data[i + 3] = 255;
            }
            // otherwise alpha == 0 and not outside -> inner transparent area; leave as-is
          }
          fctx.putImageData(frameData, 0, 0);

          // Create inner mask: opaque where inner transparent area is
          innerMask = document.createElement('canvas');
          innerMask.width = frameW;
          innerMask.height = frameH;
          const imctx = innerMask.getContext('2d')!;
          const innerData = new Uint8ClampedArray(data.length);
          for (let i = 0; i < data.length; i += 4) {
            const idx = i / 4;
            const alpha = data[i + 3];
            const isOutside = visited[idx] === 1;
            if (alpha === 0 && !isOutside) {
              // inner transparent area
              innerData[i] = 255;
              innerData[i + 1] = 255;
              innerData[i + 2] = 255;
              innerData[i + 3] = 255;
            } else {
              innerData[i + 3] = 0;
            }
          }
          const innerImageData = new ImageData(innerData, frameW, frameH);
          imctx.putImageData(innerImageData, 0, 0);

          if (frameInnerMaskCache.size > 10) {
            const first = frameInnerMaskCache.keys().next().value;
            if (first) frameInnerMaskCache.delete(first);
          }
        }

        // Apply inner mask to photoTmp: keep only photo in the inner area
        pctx.globalCompositeOperation = 'destination-in';
        pctx.drawImage(
          innerMask,
          Math.round(drawX * dpr),
          Math.round(drawY * dpr),
          Math.max(1, Math.round(drawW * dpr)),
          Math.max(1, Math.round(drawH * dpr))
        );
        pctx.globalCompositeOperation = 'source-over';

        // Clear main canvas and draw the masked photo back (work in device pixels)
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(photoTmp, 0, 0);
        ctx.restore();
      }
    } catch (e) {
      // swallow masking errors so editor still renders
    }

    // draw the frame artwork on top (normal blending)
    applyFrameOverlayEffect(ctx, params.frameOverlayRef.current, left, top, dispW, dispH);
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
