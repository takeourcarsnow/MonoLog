// Unified Effects Module
// Combines photo editor and camera effects for DRY implementation

import { CameraEffectSettings } from './cameraEffectsTypes';
import { FILTER_PRESETS } from '../imageEditor/constants';
import { mapBasicAdjustments } from '../imageEditor/filterUtils';
import { applyPixelateToFrame } from './pixelateEffect';
import { applyDitherToFrame } from './ditherEffect';
import { applyAsciiToFrame } from './asciiEffect';
import { applyFrameOverlay, applyOverlay } from './overlayEffects';
import { applySoftFocusEffect, applyFadeEffect, applyVignetteEffect, applyGrainEffect } from '../imageEditor/BasicEffects';
import { getTempCanvas, releaseTempCanvas, generateNoiseCanvas } from '../shared/canvasUtils';

// Canvas pooling for memory management
// Now imported from shared/canvasUtils

// Apply basic adjustments (exposure, contrast, saturation, temperature) via canvas filter
function applyBasicAdjustments(ctx: CanvasRenderingContext2D, settings: CameraEffectSettings): void {
  if (!settings.exposure && !settings.contrast && !settings.saturation && !settings.temperature) return;

  const { baseFilter } = mapBasicAdjustments({
    exposure: settings.exposure || 0,
    contrast: settings.contrast || 0,
    saturation: settings.saturation || 0,
    temperature: settings.temperature || 0,
  });

  if (baseFilter) {
    ctx.filter = baseFilter;
  }
}

// Apply filter presets
function applyFilterPreset(ctx: CanvasRenderingContext2D, settings: CameraEffectSettings): void {
  const preset = FILTER_PRESETS[settings.selectedFilter || 'none'];
  if (preset && settings.filterStrength && settings.filterStrength > 0) {
    // Apply filter with strength - for live camera, we'll apply it directly
    ctx.filter = preset;
  }
}

// Main unified function to apply all effects in correct order
export function applyUnifiedEffects(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  settings: CameraEffectSettings
): void {
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const targetCtx = targetCanvas.getContext('2d');

  if (!sourceCtx || !targetCtx) return;

  const { width, height } = sourceCanvas;

  // Start with clean target
  targetCtx.clearRect(0, 0, width, height);

  // 1. Copy source to target
  targetCtx.drawImage(sourceCanvas, 0, 0, width, height);

  // 2. Apply basic adjustments
  if (settings.exposure || settings.contrast || settings.saturation || settings.temperature) {
    applyBasicAdjustments(targetCtx, settings);
    // Re-draw to apply filter
    targetCtx.drawImage(sourceCanvas, 0, 0, width, height);
    targetCtx.filter = 'none'; // Reset filter
  }

  // 3. Apply filter presets
  if (settings.selectedFilter && settings.selectedFilter !== 'none' && settings.filterStrength && settings.filterStrength > 0) {
    applyFilterPreset(targetCtx, settings);
    targetCtx.drawImage(targetCanvas, 0, 0, width, height, 0, 0, width, height);
    targetCtx.filter = 'none';
  }

  // 4. Apply effects (grain, softFocus, fade, vignette)
  const tempCanvas = getTempCanvas(width, height);
  const tempCtx = tempCanvas.getContext('2d')!;

  // Copy current state to temp
  tempCtx.drawImage(targetCanvas, 0, 0);

  if (settings.grain && settings.grain > 0.001) {
    applyGrainEffect(targetCtx, 0, 0, width, height, 0, settings.grain, () => generateNoiseCanvas(width, height, settings.grain!));
  }

  if (settings.softFocus && settings.softFocus > 0.001) {
    applySoftFocusEffect(targetCtx, tempCanvas, 0, 0, width, height, 0, settings.softFocus, 1);
  }

  if (settings.fade && settings.fade > 0.001) {
    applyFadeEffect(targetCtx, 0, 0, width, height, settings.fade);
  }

  if (settings.vignette && settings.vignette > 0.001) {
    applyVignetteEffect(targetCtx, targetCanvas, 0, 0, width, height, settings.vignette);
  }

  // 5. Apply special effects based on type
  switch (settings.type) {
    case 'pixelate':
      if (settings.pixelSize && settings.pixelSize > 1) {
        applyPixelateToFrame(
          sourceCtx,
          targetCtx,
          width,
          height,
          settings.pixelSize,
          settings.pixelShape || 'square'
        );
      }
      break;

    case 'dither':
      try {
        const targetLongEdge = settings.targetLongEdge ?? 150;
        let w = width; let h = height;
        if (width >= height) { w = Math.max(1, Math.round(targetLongEdge)); h = Math.max(1, Math.round(targetLongEdge * (height / width))); }
        else { h = Math.max(1, Math.round(targetLongEdge)); w = Math.max(1, Math.round(targetLongEdge * (width / height))); }

        const smallSrc = getTempCanvas(w, h);
        const ssrc = smallSrc.getContext('2d', { willReadFrequently: true })!;
        ssrc.drawImage(sourceCtx.canvas, 0, 0, sourceCtx.canvas.width, sourceCtx.canvas.height, 0, 0, w, h);

        const smallOut = getTempCanvas(w, h);
        const sout = smallOut.getContext('2d')!;

        applyDitherToFrame(ssrc, sout, w, h, settings.ditherLevels || 3, settings.ditherColorMode || 'bw', settings.ditherMethod || 'ordered', settings.ditherPalette || 'auto');

        const prev = (targetCtx as any).imageSmoothingEnabled;
        (targetCtx as any).imageSmoothingEnabled = false;
        targetCtx.drawImage(smallOut, 0, 0, w, h, 0, 0, targetCtx.canvas.width, targetCtx.canvas.height);
        (targetCtx as any).imageSmoothingEnabled = prev;

        releaseTempCanvas(smallSrc);
        releaseTempCanvas(smallOut);
      } catch (e) {
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
      if (settings.asciiEnabled !== false) { // Default to enabled
        applyAsciiToFrame(
          sourceCtx,
          targetCtx,
          width,
          height,
          settings.asciiCellSize || 8,
          settings.asciiCharset || "@%#*+=-:. ",
          settings.asciiInvert || false,
          settings.asciiColor !== false
        );
      }
      break;

    default:
      // For other types, effects are already applied above
      break;
  }

  // 6. Apply overlay
  if (settings.overlay) {
    applyOverlay(targetCtx, width, height, settings.overlay);
  }

  // 7. Apply frame overlay
  if (settings.frameOverlay) {
    applyFrameOverlay(targetCtx, width, height, settings.frameOverlay);
  }

  releaseTempCanvas(tempCanvas);
}