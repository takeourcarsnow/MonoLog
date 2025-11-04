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