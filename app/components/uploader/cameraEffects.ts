/**
 * Camera Effects - Main Module
 *
 * Orchestrates real-time video frame processing effects
 */

import { CameraEffectSettings, CameraEffectType, DEFAULT_ASCII_CHARSET } from './cameraEffectsTypes';
import { applyPixelateToFrame } from './pixelateEffect';
import { applyDitherToFrame } from './ditherEffect';
import { applyAsciiToFrame } from './asciiEffect';
import { applyFrameOverlay, applyOverlay } from './overlayEffects';

// Canvas pooling for memory management
const canvasPool: HTMLCanvasElement[] = [];
const MAX_POOL_SIZE = 10;

function getTempCanvas(width: number, height: number): HTMLCanvasElement {
  let canvas = canvasPool.pop();
  if (!canvas) {
    canvas = document.createElement('canvas');
  }
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function releaseTempCanvas(canvas: HTMLCanvasElement): void {
  if (canvasPool.length < MAX_POOL_SIZE) {
    // Clear the canvas before pooling
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    canvasPool.push(canvas);
  }
}

// Main function to apply selected effect
export function applyCameraEffect(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  settings: CameraEffectSettings
): void {
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const targetCtx = targetCanvas.getContext('2d');

  if (!sourceCtx || !targetCtx) return;

  const { width, height } = sourceCanvas;

  switch (settings.type) {
    case 'pixelate':
      applyPixelateToFrame(
        sourceCtx,
        targetCtx,
        width,
        height,
        settings.pixelSize || 8,
        settings.pixelShape || 'square'
      );
      break;

    case 'dither':
      // For live camera we prefer a chunkier, retro look and better performance.
      // Downscale the source to a small working resolution (controlled by targetLongEdge)
      // then run the dithering on that small canvas and upscale without smoothing.
      try {
        const targetLongEdge = (settings as any).targetLongEdge ?? 150; // pixels on the long edge
        // compute downscaled size preserving aspect
        let w = width; let h = height;
        if (width >= height) { w = Math.max(1, Math.round(targetLongEdge)); h = Math.max(1, Math.round(targetLongEdge * (height / width))); }
        else { h = Math.max(1, Math.round(targetLongEdge)); w = Math.max(1, Math.round(targetLongEdge * (width / height))); }

        // create small source and output canvases
        const smallSrc = getTempCanvas(w, h);
        const ssrc = smallSrc.getContext('2d', { willReadFrequently: true })!;
        // draw and downscale
        ssrc.drawImage(sourceCtx.canvas, 0, 0, sourceCtx.canvas.width, sourceCtx.canvas.height, 0, 0, w, h);

        const smallOut = getTempCanvas(w, h);
        const sout = smallOut.getContext('2d')!;

        // perform dithering at small size
        applyDitherToFrame(ssrc, sout, w, h, settings.ditherLevels || 3, settings.ditherColorMode || 'bw', settings.ditherMethod || 'ordered', settings.ditherPalette || 'auto');

        // draw back to target with smoothing disabled to preserve pixel blocks
        const prev = (targetCtx as any).imageSmoothingEnabled;
        (targetCtx as any).imageSmoothingEnabled = false;
        targetCtx.drawImage(smallOut, 0, 0, w, h, 0, 0, targetCtx.canvas.width, targetCtx.canvas.height);
        (targetCtx as any).imageSmoothingEnabled = prev;

        // Release canvases back to pool
        releaseTempCanvas(smallSrc);
        releaseTempCanvas(smallOut);
      } catch (e) {
        // fallback to direct full-size dithering if anything fails
        applyDitherToFrame(
          sourceCtx,
          targetCtx,
          width,
          height,
          settings.ditherLevels || 3,
          settings.ditherColorMode || 'bw',
          settings.ditherMethod || 'ordered',
          settings.ditherPalette || 'auto'
        );
      }
      break;

    case 'ascii':
      applyAsciiToFrame(
        sourceCtx,
        targetCtx,
        width,
        height,
        settings.asciiCellSize || 8,
        settings.asciiCharset || DEFAULT_ASCII_CHARSET,
        settings.asciiInvert || false,
        settings.asciiColor !== false // Default to true (color enabled)
      );
      break;

    case 'none':
    default:
      targetCtx.drawImage(sourceCanvas, 0, 0, width, height);
      break;
  }

  // Apply overlay with blend mode (before frame)
  if (settings.overlay) {
    applyOverlay(targetCtx, width, height, settings.overlay);
  }

  // Apply decorative frame overlay (on top of everything)
  if (settings.frameOverlay) {
    applyFrameOverlay(targetCtx, width, height, settings.frameOverlay);
  }
}

// Re-export types for convenience
export type { CameraEffectType, CameraEffectSettings };