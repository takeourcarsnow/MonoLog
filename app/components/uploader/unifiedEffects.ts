// Unified Effects Module
// Combines photo editor and camera effects for DRY implementation

import { CameraEffectSettings } from './cameraEffectsTypes';
import { FILTER_PRESETS } from '../imageEditor/effectsConfig';
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
      // Dither is now handled below if enabled
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

    case 'text':
      // Text is now handled below if enabled
      break;

    default:
      // For other types, effects are already applied above
      break;
  }

  // Apply dithering if enabled (independent of type)
  if (settings.ditherEnabled) {
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
  }

  // Apply text overlay if enabled (independent of type)
  if (settings.textEnabled !== false && settings.textContent) { // Default to enabled if text exists
    applyTextOverlayToFrame(
      targetCtx,
      width,
      height,
      settings.textContent,
      settings.textFontSize || 24,
      settings.textFontFamily || 'Arial',
      settings.textColor || '#ffffff',
      true, // Always bold
      settings.textShadow || false,
      settings.textAlign || 'center',
      settings.textPosition || 'center',
      settings.textX,
      settings.textY,
      settings.textOpacity || 1,
      settings.textRotation || 0,
      settings.textScale || 1,
      settings.textStroke || false,
      settings.textStrokeColor || '#000000',
      settings.textStrokeWidth || 2
    );
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

// Text rendering cache for performance optimization
const textCache = new Map<string, { canvas: HTMLCanvasElement; lastUsed: number }>();
const CACHE_SIZE = 10;
const CACHE_TTL = 30000; // 30 seconds

// Export cleanup function for manual cache management
export function clearTextCache() {
  textCache.clear();
}

// Performance optimization: skip text rendering if settings haven't changed
let lastTextSettings: string = '';
let lastFontFamily: string = '';

export function shouldSkipTextRender(
  text: string,
  fontSize: number,
  fontFamily: string,
  color: string,
  bold: boolean,
  shadow: boolean,
  align: string,
  stroke: boolean,
  strokeColor: string,
  strokeWidth: number,
  position: string,
  textX: number | undefined,
  textY: number | undefined,
  opacity: number,
  scale: number
): boolean {
  // Don't skip if font family changed (font might not be loaded yet)
  if (fontFamily !== lastFontFamily) {
    lastFontFamily = fontFamily;
    return false;
  }

  const currentSettings = `${text}|${fontSize}|${fontFamily}|${color}|${bold}|${shadow}|${align}|${stroke}|${strokeColor}|${strokeWidth}|${position}|${textX}|${textY}|${opacity}|${scale}`;
  if (currentSettings === lastTextSettings) {
    return true;
  }
  lastTextSettings = currentSettings;
  return false;
}

// Clean up old cached text canvases
function cleanupTextCache() {
  const now = Date.now();
  const entries = Array.from(textCache.entries());

  // Remove expired entries
  for (const [key, value] of entries) {
    if (now - value.lastUsed > CACHE_TTL) {
      textCache.delete(key);
    }
  }

  // If still too many entries, remove oldest
  if (textCache.size > CACHE_SIZE) {
    const sortedEntries = entries
      .filter(([_, value]) => now - value.lastUsed <= CACHE_TTL)
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

    const toRemove = sortedEntries.slice(0, textCache.size - CACHE_SIZE);
    for (const [key] of toRemove) {
      textCache.delete(key);
    }
  }
}

// Get cached text canvas or create new one
function getCachedTextCanvas(
  text: string,
  fontSize: number,
  fontFamily: string,
  color: string,
  bold: boolean,
  shadow: boolean,
  align: string,
  stroke: boolean,
  strokeColor: string,
  strokeWidth: number
): HTMLCanvasElement {
  const cacheKey = `${text}|${fontSize}|${fontFamily}|${color}|${bold}|${shadow}|${align}|${stroke}|${strokeColor}|${strokeWidth}`;

  const cached = textCache.get(cacheKey);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.canvas;
  }

  // Create new text canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Split text into lines
  const lines = text.split('\n');
  const fontWeight = bold ? 'bold' : 'normal';

  // Set font for measurement
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  // Get font metrics for proper sizing
  const metrics = ctx.measureText('Ag'); // Use characters with ascenders and descenders
  const fontAscent = metrics.actualBoundingBoxAscent || fontSize * 0.8; // Fallback for browsers without actualBoundingBox
  const fontDescent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
  const lineHeight = fontAscent + fontDescent + fontSize * 0.2; // Add some extra spacing

  // Measure all lines to find max width
  let maxWidth = 0;
  for (const line of lines) {
    const lineMetrics = ctx.measureText(line);
    maxWidth = Math.max(maxWidth, lineMetrics.width);
  }

  // Set canvas size with padding (extra padding for shadow and font overflow)
  const padding = shadow ? 16 : 12; // Increased padding for decorative fonts
  canvas.width = Math.ceil(maxWidth) + padding * 2;
  canvas.height = Math.ceil(lines.length * lineHeight) + padding * 2;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Set font and alignment
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic'; // Better baseline for proper glyph positioning

  // Draw each line
  for (let i = 0; i < lines.length; i++) {
    const baselineY = padding + fontAscent + i * lineHeight;
    let x = padding;

    // Adjust x position based on alignment
    if (align === 'center') {
      x = (canvas.width - ctx.measureText(lines[i]).width) / 2;
    } else if (align === 'right') {
      x = canvas.width - ctx.measureText(lines[i]).width - padding;
    }

    // Apply shadow if enabled
    if (shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Apply stroke if enabled
    if (stroke) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.strokeText(lines[i], x, baselineY);
    }

    // Apply fill
    ctx.fillStyle = color;
    ctx.fillText(lines[i], x, baselineY);
  }

  // Cache the canvas
  textCache.set(cacheKey, { canvas, lastUsed: Date.now() });

  // Clean up cache periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    cleanupTextCache();
  }

  return canvas;
}

// Apply text overlay to frame
function applyTextOverlayToFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  fontSize: number,
  fontFamily: string,
  color: string,
  bold: boolean,
  shadow: boolean,
  align: string,
  position: string,
  textX: number | undefined,
  textY: number | undefined,
  opacity: number,
  rotation: number,
  scale: number,
  stroke: boolean,
  strokeColor: string,
  strokeWidth: number
): void {
  if (!text.trim()) return;

  // Performance optimization: skip if settings haven't changed
  if (shouldSkipTextRender(text, fontSize, fontFamily, color, bold, shadow, align, stroke, strokeColor, strokeWidth, position, textX, textY, opacity, scale)) {
    // Use cached text canvas directly without re-checking
    const cacheKey = `${text}|${fontSize}|${fontFamily}|${color}|${bold}|${shadow}|${align}|${stroke}|${strokeColor}|${strokeWidth}`;
    const cached = textCache.get(cacheKey);
    if (cached) {
      ctx.save();
      ctx.globalAlpha = opacity;

      // Calculate position
      let x = width / 2;
      let y = height / 2;

      // Use manual coordinates if available, otherwise use predefined positions
      if (textX !== undefined && textY !== undefined) {
        x = textX * width;
        y = textY * height;
      } else {
        // Fallback to predefined positions
        switch (position) {
          case 'top-left':
            x = 20;
            y = 20;
            break;
          case 'top-center':
            x = width / 2;
            y = 20;
            break;
          case 'top-right':
            x = width - 20;
            y = 20;
            break;
          case 'center-left':
            x = 20;
            y = height / 2;
            break;
          case 'center':
            x = width / 2;
            y = height / 2;
            break;
          case 'center-right':
            x = width - 20;
            y = height / 2;
            break;
          case 'bottom-left':
            x = 20;
            y = height - 20;
            break;
          case 'bottom-center':
            x = width / 2;
            y = height - 20;
            break;
          case 'bottom-right':
            x = width - 20;
            y = height - 20;
            break;
        }
      }

      // Apply rotation
      if (rotation && rotation !== 0) {
        ctx.translate(x, y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-x, -y);
      }

      // Apply scaling
      if (scale && scale !== 1) {
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.translate(-x, -y);
      }

      // Calculate draw position (center the text canvas on the target position)
      const drawX = x - cached.canvas.width / 2;
      const drawY = y - cached.canvas.height / 2;

      // Draw the cached text canvas
      ctx.drawImage(cached.canvas, drawX, drawY);
      ctx.restore();
      return;
    }
  }

  ctx.save();
  ctx.globalAlpha = opacity;

  // Calculate position
  let x = width / 2;
  let y = height / 2;

  // Use manual coordinates if available, otherwise use predefined positions
  if (textX !== undefined && textY !== undefined) {
    x = textX * width;
    y = textY * height;
  } else {
    // Fallback to predefined positions
    switch (position) {
      case 'top-left':
        x = 20;
        y = 20;
        break;
      case 'top-center':
        x = width / 2;
        y = 20;
        break;
      case 'top-right':
        x = width - 20;
        y = 20;
        break;
      case 'center-left':
        x = 20;
        y = height / 2;
        break;
      case 'center':
        x = width / 2;
        y = height / 2;
        break;
      case 'center-right':
        x = width - 20;
        y = height / 2;
        break;
      case 'bottom-left':
        x = 20;
        y = height - 20;
        break;
      case 'bottom-center':
        x = width / 2;
        y = height - 20;
        break;
      case 'bottom-right':
        x = width - 20;
        y = height - 20;
        break;
    }
  }

  // Apply rotation
  if (rotation && rotation !== 0) {
    ctx.translate(x, y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-x, -y);
  }

  // Apply scaling
  if (scale && scale !== 1) {
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);
  }

  // Get cached text canvas
  const textCanvas = getCachedTextCanvas(text, fontSize, fontFamily, color, bold, shadow, align, stroke, strokeColor, strokeWidth);

  // Calculate draw position (center the text canvas on the target position)
  const drawX = x - textCanvas.width / 2;
  const drawY = y - textCanvas.height / 2;

  // Draw the cached text canvas
  ctx.drawImage(textCanvas, drawX, drawY);

  ctx.restore();
}