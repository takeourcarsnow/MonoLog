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
  frameOverlay: { img: HTMLImageElement; opacity: number } | null,
  onApply: (dataUrl: string, settings: EditorSettings) => void
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
  const centerX = out.width / 2;
  const centerY = out.height / 2;

  const rot = rotationRef.current ?? rotation;
  const angle = (rot * Math.PI) / 180;

  applyFiltersAndDraw(
    img, srcX, srcY, srcW, srcH, out, octx, centerX, centerY, drawSizeW, drawSizeH, angle,
    exposure, contrast, saturation, temperature, selectedFilter, filterStrength
  );

  // Apply additional visual effects
  applySoftFocus(img, srcX, srcY, srcW, srcH, octx, padPx, softFocus);
  applyFade(octx, padPx, srcW, srcH, fade);
  applyGrain(srcW, srcH, octx, padPx, grain);

  // Draw overlay
  drawOverlay(octx, centerX, centerY, angle, drawSizeW, drawSizeH, overlay);

  // Apply frame overlay
  applyFrameOverlay(out, octx, drawX, drawY, drawW, drawH, frameOverlay);

  // Draw frame
  drawFrame(octx, srcW, srcH, padPx, frameThickness, frameColor);

  const dataUrl = generateDataUrl(out, hasFrameOverlay, drawX, drawY, drawW, drawH);

  const settings = createSettings(
    exposure, contrast, saturation, temperature, rotation, vignette, frameColor, frameThickness,
    selectedFilter, filterStrength, grain, softFocus, fade, overlay, frameOverlay
  );

  onApply(dataUrl, settings);
}
