/**
 * Overlay Effects
 *
 * Handles frame overlays and blend mode overlays for video frames
 */

import { computeFrameBounds } from './frameBounds';

// Apply frame overlay to canvas
export function applyFrameOverlay(
  targetCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frameOverlay: { img: HTMLImageElement; opacity: number; bounds?: { minX: number; minY: number; maxX: number; maxY: number } }
): void {
  const { img, opacity } = frameOverlay;

  // Compute bounds if not provided
  const bounds = frameOverlay.bounds || computeFrameBounds(img);

  targetCtx.save();
  targetCtx.globalAlpha = opacity;

  if (bounds && bounds.minX < bounds.maxX && bounds.minY < bounds.maxY) {
    // Draw frame overlay with bounds (decorative frame)
    const frameWidth = img.naturalWidth || img.width;
    const frameHeight = img.naturalHeight || img.height;

    // Scale to fit canvas
    const scaleX = width / frameWidth;
    const scaleY = height / frameHeight;
    const scale = Math.min(scaleX, scaleY);

    const scaledWidth = frameWidth * scale;
    const scaledHeight = frameHeight * scale;
    const offsetX = (width - scaledWidth) / 2;
    const offsetY = (height - scaledHeight) / 2;

    targetCtx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
  } else {
    // Draw full frame overlay
    targetCtx.drawImage(img, 0, 0, width, height);
  }

  targetCtx.restore();
}

// Apply overlay with blend mode to canvas
export function applyOverlay(
  targetCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlay: { img: HTMLImageElement; blendMode: string; opacity: number }
): void {
  const { img, blendMode, opacity } = overlay;

  targetCtx.save();
  targetCtx.globalAlpha = opacity;
  targetCtx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
  targetCtx.drawImage(img, 0, 0, width, height);
  targetCtx.restore();
}