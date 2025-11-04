/**
 * ASCII Effect
 *
 * Converts video frames to ASCII art representation
 */

import { DEFAULT_ASCII_CHARSET } from './cameraEffectsTypes';

// Apply ASCII art effect to video frame
export function applyAsciiToFrame(
  sourceCtx: CanvasRenderingContext2D,
  targetCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number = 8,
  charset: string = DEFAULT_ASCII_CHARSET,
  invert: boolean = false
): void {
  const cols = Math.floor(width / cellSize);
  const rows = Math.floor(height / cellSize);

  targetCtx.fillStyle = '#000';
  targetCtx.fillRect(0, 0, width, height);
  targetCtx.font = `${cellSize}px monospace`;
  targetCtx.textAlign = 'center';
  targetCtx.textBaseline = 'middle';

  const imageData = sourceCtx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const chars = charset.split('');
  const charRange = chars.length - 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Sample average color of cell
      let totalR = 0, totalG = 0, totalB = 0;
      let samples = 0;

      for (let dy = 0; dy < cellSize; dy++) {
        for (let dx = 0; dx < cellSize; dx++) {
          const x = col * cellSize + dx;
          const y = row * cellSize + dy;

          if (x < width && y < height) {
            const idx = (y * width + x) * 4;
            totalR += data[idx];
            totalG += data[idx + 1];
            totalB += data[idx + 2];
            samples++;
          }
        }
      }

      const avgR = Math.round(totalR / samples);
      const avgG = Math.round(totalG / samples);
      const avgB = Math.round(totalB / samples);
      const avgBrightness = (avgR * 0.299 + avgG * 0.587 + avgB * 0.114) / 255;
      const adjustedBrightness = invert ? 1 - avgBrightness : avgBrightness;
      const charIndex = Math.floor(adjustedBrightness * charRange);
      const char = chars[charIndex];

      targetCtx.fillStyle = `rgb(${avgR},${avgG},${avgB})`;
      targetCtx.fillText(
        char,
        col * cellSize + cellSize / 2,
        row * cellSize + cellSize / 2
      );
    }
  }
}