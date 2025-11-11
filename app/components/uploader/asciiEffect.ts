/**
 * ASCII Effect
 *
 * Converts video frames to ASCII art representation
 */

import { DEFAULT_ASCII_CHARSET } from './cameraEffectsTypes';
import { getTempCanvas, releaseTempCanvas } from '../shared/canvasUtils';

// Apply ASCII art effect to video frame
export function applyAsciiToFrame(
  sourceCtx: CanvasRenderingContext2D,
  targetCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number = 8,
  charset: string = DEFAULT_ASCII_CHARSET,
  invert: boolean = false,
  useColor: boolean = true
): void {
  const cols = Math.floor(width / cellSize);
  const rows = Math.floor(height / cellSize);

  targetCtx.fillStyle = '#000';
  targetCtx.fillRect(0, 0, width, height);
  targetCtx.font = `${cellSize}px monospace`;
  targetCtx.textAlign = 'center';
  targetCtx.textBaseline = 'middle';

  // Downscale source into a small temporary canvas matching the cell grid
  // This reduces per-frame pixel sampling significantly for large frames
  const sampleCanvas = getTempCanvas(cols, rows);
  try {
    const sctx = sampleCanvas.getContext('2d', { willReadFrequently: true })!;
    // Draw scaled-down version of sourceCanvas into sampleCanvas
    sctx.drawImage(sourceCtx.canvas, 0, 0, sourceCtx.canvas.width, sourceCtx.canvas.height, 0, 0, cols, rows);

    const imageData = sctx.getImageData(0, 0, cols, rows);
    const data = imageData.data;

    const chars = charset.split('');
    const charRange = chars.length - 1;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = (row * cols + col) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const avgBrightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        const adjustedBrightness = invert ? 1 - avgBrightness : avgBrightness;
        const charIndex = Math.floor(adjustedBrightness * charRange);
        const char = chars[charIndex];

        if (useColor) {
          targetCtx.fillStyle = `rgb(${r},${g},${b})`;
        } else {
          const grayValue = Math.round(avgBrightness * 255);
          targetCtx.fillStyle = `rgb(${grayValue},${grayValue},${grayValue})`;
        }

        targetCtx.fillText(
          char,
          col * cellSize + cellSize / 2,
          row * cellSize + cellSize / 2
        );
      }
    }
  } finally {
    try { releaseTempCanvas(sampleCanvas); } catch (e) {}
  }
}