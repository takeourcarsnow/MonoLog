import { generateNoiseCanvas } from './imageEditorHelpers';
import { FILTER_PRESETS } from './constants';
import { mapBasicAdjustments } from './filterUtils';
import { applyWebGLAdjustments } from './webglFilters';
import type { EditorSettings } from './types';
import { calculateCropArea, calculateCanvasSize, calculateFrameOverlaySize } from './ImageEditSetup';
import { applyFiltersAndDraw } from './ImageEditProcessing';
import { applySoftFocus, applyFade, applyGrain } from './ImageEditEffects';
import { drawOverlay, applyFrameOverlay } from './ImageEditOverlays';
import { drawFrame } from './ImageEditFrame';
import { generateDataUrl, createSettings } from './ImageEditExport';

export async function applyEdit(
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
  overlay: { img: HTMLImageElement; blendMode: string; opacity: number } | null,
  frameOverlay: { img: HTMLImageElement; opacity: number; bounds?: { minX: number; minY: number; maxX: number; maxY: number } } | null,
  onApply: (dataUrl: string, settings: EditorSettings) => Promise<void>
) {
  const img = imgRef.current; if (!img) return;
  const canvas = canvasRef.current;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const baseScale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
  const scaleFactor = baseScale;

  const { srcX, srcY, srcW, srcH } = calculateCropArea(img, sel, offset, rect, baseScale);

  const { outWidth, outHeight, padPx, rotatedW, rotatedH } = calculateCanvasSize(srcW, srcH, frameThickness, rotation);

  const { hasFrameOverlay, drawW, drawH, drawX, drawY, drawSizeW, drawSizeH } = calculateFrameOverlaySize(outWidth, outHeight, srcW, srcH, frameOverlay);

  const out = document.createElement('canvas');
  out.width = outWidth; out.height = outHeight;
  const octx = out.getContext('2d')!;
  octx.imageSmoothingQuality = 'high';
  let centerX = out.width / 2;
  let centerY = out.height / 2;
  let photoDrawSizeW = drawSizeW;
  let photoDrawSizeH = drawSizeH;

  if (hasFrameOverlay) {
    const frameImg = frameOverlay!.img;
    const frameW = frameImg.naturalWidth;
    const frameH = frameImg.naturalHeight;
    const scale = drawW / frameW;

    // Use precomputed bounds if available, otherwise calculate
    let minX: number, minY: number, maxX: number, maxY: number;
    if (frameOverlay!.bounds) {
      ({ minX, minY, maxX, maxY } = frameOverlay!.bounds);
    } else {
      // Calculate bounds of opaque pixels in frame
      const frameTemp = document.createElement('canvas');
      frameTemp.width = frameW;
      frameTemp.height = frameH;
      const fctx = frameTemp.getContext('2d')!;
      fctx.drawImage(frameImg, 0, 0);
      const frameData = fctx.getImageData(0, 0, frameW, frameH);
      const data = frameData.data;
      minX = frameW; minY = frameH; maxX = -1; maxY = -1;
      for (let y = 0; y < frameH; y++) {
        for (let x = 0; x < frameW; x++) {
          const idx = (y * frameW + x) * 4;
          const alpha = data[idx + 3];
          if (alpha > 16) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    }
    const innerW = maxX - minX + 1;
    const innerH = maxY - minY + 1;
    const photoAspect = srcW / srcH;
    const innerAspect = innerW / innerH;
    let photoScale;
    if (photoAspect > innerAspect) {
      photoScale = (innerH * scale) / srcH;
    } else {
      photoScale = (innerW * scale) / srcW;
    }
    const photoW = srcW * photoScale;
    const photoH = srcH * photoScale;
    const photoX = drawX + (minX * scale) + ((innerW * scale) - photoW) / 2;
    const photoY = drawY + (minY * scale) + ((innerH * scale) - photoH) / 2;

    centerX = photoX + photoW / 2;
    centerY = photoY + photoH / 2;
    photoDrawSizeW = photoW;
    photoDrawSizeH = photoH;
  }

  const rot = rotationRef.current ?? rotation;
  const angle = (rot * Math.PI) / 180;

  applyFiltersAndDraw(
    img, srcX, srcY, srcW, srcH, out, octx, centerX, centerY, photoDrawSizeW, photoDrawSizeH, angle,
    exposure, contrast, saturation, temperature, selectedFilter, filterStrength
  );

  // Apply additional visual effects
  applySoftFocus(img, srcX, srcY, srcW, srcH, octx, padPx, softFocus);
  applyFade(octx, padPx, srcW, srcH, fade);
  applyGrain(srcW, srcH, octx, padPx, grain);

  // Draw overlay
  drawOverlay(octx, centerX, centerY, angle, photoDrawSizeW, photoDrawSizeH, overlay);

  // Apply frame overlay
  applyFrameOverlay(out, octx, drawX, drawY, drawW, drawH, frameOverlay);

  // Draw frame
  drawFrame(octx, srcW, srcH, padPx, frameThickness, frameColor);

  const dataUrl = generateDataUrl(out, hasFrameOverlay, drawX, drawY, drawW, drawH);

  const settings = createSettings(
    exposure, contrast, saturation, temperature, rotation, vignette, frameColor, frameThickness,
    selectedFilter, filterStrength, grain, softFocus, fade, overlay, frameOverlay
  );

  await onApply(dataUrl, settings);
}
