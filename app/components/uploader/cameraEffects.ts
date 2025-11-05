/**
 * Camera Effects - Main Module
 *
 * Orchestrates real-time video frame processing effects
 */

import { CameraEffectSettings, CameraEffectType } from './cameraEffectsTypes';
import { applyPixelateToFrame } from './pixelateEffect';
import { applyDitherToFrame } from './ditherEffect';
import { applyAsciiToFrame } from './asciiEffect';
import { applyFrameOverlay, applyOverlay } from './overlayEffects';

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
        const smallSrc = document.createElement('canvas'); smallSrc.width = w; smallSrc.height = h;
        const ssrc = smallSrc.getContext('2d', { willReadFrequently: true })!;
        // draw and downscale
        ssrc.drawImage(sourceCtx.canvas, 0, 0, sourceCtx.canvas.width, sourceCtx.canvas.height, 0, 0, w, h);

        const smallOut = document.createElement('canvas'); smallOut.width = w; smallOut.height = h;
        const sout = smallOut.getContext('2d')!;

        // perform dithering at small size
        applyDitherToFrame(ssrc, sout, w, h, settings.ditherLevels || 3, settings.ditherColorMode || 'bw', settings.ditherMethod || 'ordered', settings.ditherPalette || 'auto');

        // draw back to target with smoothing disabled to preserve pixel blocks
        const prev = (targetCtx as any).imageSmoothingEnabled;
        (targetCtx as any).imageSmoothingEnabled = false;
        targetCtx.drawImage(smallOut, 0, 0, w, h, 0, 0, targetCtx.canvas.width, targetCtx.canvas.height);
        (targetCtx as any).imageSmoothingEnabled = prev;
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
        settings.asciiCharset || ' .:-=+*#%@',
        settings.asciiInvert || false
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