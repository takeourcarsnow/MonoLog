/**
 * Dither Effect
 *
 * Applies various dithering algorithms to video frames with support for color palettes
 */

import { COLOR_PALETTES } from './cameraEffectsTypes';

// Apply dithering with various algorithms
export function applyDitherToFrame(
  sourceCtx: CanvasRenderingContext2D,
  targetCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  levels: number = 3,
  colorMode: 'bw' | 'color' = 'bw',
  method: 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes' = 'ordered',
  palette: string = 'auto'
): void {
  // Some callers may pass a context that was not created with
  // { willReadFrequently: true } which makes repeated getImageData calls
  // slower and triggers a browser warning. To avoid that and ensure
  // efficient readbacks, copy the source into a temporary canvas whose
  // 2D context is created with willReadFrequently: true and read from it.
  const temp = document.createElement('canvas');
  temp.width = width;
  temp.height = height;
  const readCtx = (temp.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null) || temp.getContext('2d')!;
  // Draw the source into our temp canvas, scaling if necessary
  try {
    readCtx.drawImage((sourceCtx.canvas as HTMLCanvasElement), 0, 0, sourceCtx.canvas.width, sourceCtx.canvas.height, 0, 0, width, height);
  } catch (e) {
    // Fallback: if drawImage fails for some reason, attempt direct read
    try { readCtx.drawImage((sourceCtx as any).canvas || sourceCtx, 0, 0); } catch {}
  }
  const imageData = readCtx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Get color palette if using color mode with specific palette
  const usePalette = colorMode === 'color' && palette !== 'auto' && COLOR_PALETTES[palette];
  const paletteColors = usePalette ? COLOR_PALETTES[palette] : null;

  // Cache for palette lookups - huge performance boost for color dithering
  const paletteCache = paletteColors ? new Map<number, [number, number, number]>() : null;

  // Helper function to find nearest palette color (optimized with cache and no sqrt)
  const findNearestPaletteColor = (r: number, g: number, b: number): [number, number, number] => {
    if (!paletteColors) return [r, g, b];

    // Clamp values
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));

    // Create cache key (24-bit RGB)
    const key = (r << 16) | (g << 8) | b;

    // Check cache
    if (paletteCache!.has(key)) {
      return paletteCache!.get(key)!;
    }

    let minDist = Infinity;
    let nearestColor: [number, number, number] = [r, g, b];

    // Use squared distance to avoid expensive sqrt
    for (const pColor of paletteColors) {
      const dr = r - pColor[0];
      const dg = g - pColor[1];
      const db = b - pColor[2];
      const dist = dr * dr + dg * dg + db * db;

      if (dist < minDist) {
        minDist = dist;
        nearestColor = [pColor[0], pColor[1], pColor[2]];
      }
    }

    // Cache result
    paletteCache!.set(key, nearestColor);

    return nearestColor;
  };

  if (method === 'ordered') {
    // Bayer matrix 4x4 for ordered dithering
    const bayerMatrix = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5]
    ];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const threshold = (bayerMatrix[y % 4][x % 4] / 16 - 0.5) * 0.3;

        if (colorMode === 'bw') {
          // Grayscale
          const gray = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
          const quantized = Math.round((gray + threshold) * (levels - 1)) / (levels - 1);
          const value = Math.round(quantized * 255);
          data[idx] = data[idx + 1] = data[idx + 2] = value;
        } else {
          // Color dithering
          if (paletteColors) {
            // Quantize to palette - optimized to do once per pixel
            const [nr, ng, nb] = findNearestPaletteColor(data[idx], data[idx + 1], data[idx + 2]);
            data[idx] = nr;
            data[idx + 1] = ng;
            data[idx + 2] = nb;
          } else {
            // Standard quantization
            for (let c = 0; c < 3; c++) {
              const normalized = data[idx + c] / 255;
              const quantized = Math.round((normalized + threshold) * (levels - 1)) / (levels - 1);
              data[idx + c] = Math.round(quantized * 255);
            }
          }
        }
      }
    }
  } else if (method === 'floyd-steinberg') {
    // Floyd-Steinberg dithering (more expensive but higher quality)
    const errors = new Float32Array(width * height * 3);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const errIdx = (y * width + x) * 3;

        if (colorMode === 'bw') {
          const gray = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114 + errors[errIdx]) / 255;
          const quantized = Math.round(gray * (levels - 1)) / (levels - 1);
          const value = Math.round(quantized * 255);
          const error = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) - value;

          data[idx] = data[idx + 1] = data[idx + 2] = value;

          // Distribute error to neighboring pixels (Floyd-Steinberg matrix)
          if (x + 1 < width) errors[(y * width + x + 1) * 3] += error * 7 / 16;
          if (y + 1 < height) {
            if (x > 0) errors[((y + 1) * width + x - 1) * 3] += error * 3 / 16;
            errors[((y + 1) * width + x) * 3] += error * 5 / 16;
            if (x + 1 < width) errors[((y + 1) * width + x + 1) * 3] += error * 1 / 16;
          }
        } else {
          // Color dithering - optimized to process RGB together
          if (paletteColors) {
            // Get old pixel with errors
            const oldR = data[idx] + errors[errIdx];
            const oldG = data[idx + 1] + errors[errIdx + 1];
            const oldB = data[idx + 2] + errors[errIdx + 2];

            // Find nearest palette color once
            const [newR, newG, newB] = findNearestPaletteColor(oldR, oldG, oldB);

            // Calculate errors for each channel
            const errorR = oldR - newR;
            const errorG = oldG - newG;
            const errorB = oldB - newB;

            data[idx] = newR;
            data[idx + 1] = newG;
            data[idx + 2] = newB;

            // Distribute errors
            if (x + 1 < width) {
              const nextIdx = (y * width + x + 1) * 3;
              errors[nextIdx] += errorR * 7 / 16;
              errors[nextIdx + 1] += errorG * 7 / 16;
              errors[nextIdx + 2] += errorB * 7 / 16;
            }
            if (y + 1 < height) {
              if (x > 0) {
                const blIdx = ((y + 1) * width + x - 1) * 3;
                errors[blIdx] += errorR * 3 / 16;
                errors[blIdx + 1] += errorG * 3 / 16;
                errors[blIdx + 2] += errorB * 3 / 16;
              }
              const bIdx = ((y + 1) * width + x) * 3;
              errors[bIdx] += errorR * 5 / 16;
              errors[bIdx + 1] += errorG * 5 / 16;
              errors[bIdx + 2] += errorB * 5 / 16;
              if (x + 1 < width) {
                const brIdx = ((y + 1) * width + x + 1) * 3;
                errors[brIdx] += errorR * 1 / 16;
                errors[brIdx + 1] += errorG * 1 / 16;
                errors[brIdx + 2] += errorB * 1 / 16;
              }
            }
          } else {
            // Standard quantization per channel
            for (let c = 0; c < 3; c++) {
              const oldPixel = data[idx + c] + errors[errIdx + c];
              const quantized = Math.round((oldPixel / 255) * (levels - 1)) / (levels - 1);
              const newPixel = Math.round(quantized * 255);
              const error = oldPixel - newPixel;
              data[idx + c] = newPixel;

              // Distribute error
              if (x + 1 < width) errors[(y * width + x + 1) * 3 + c] += error * 7 / 16;
              if (y + 1 < height) {
                if (x > 0) errors[((y + 1) * width + x - 1) * 3 + c] += error * 3 / 16;
                errors[((y + 1) * width + x) * 3 + c] += error * 5 / 16;
                if (x + 1 < width) errors[((y + 1) * width + x + 1) * 3 + c] += error * 1 / 16;
              }
            }
          }
        }
      }
    }
  } else if (method === 'atkinson') {
    // Atkinson dithering - softer than Floyd-Steinberg
    const errors = new Float32Array(width * height * 3);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const errIdx = (y * width + x) * 3;

        if (colorMode === 'bw') {
          const gray = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114 + errors[errIdx]) / 255;
          const quantized = Math.round(gray * (levels - 1)) / (levels - 1);
          const value = Math.round(quantized * 255);
          const error = ((data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) - value) / 8;

          data[idx] = data[idx + 1] = data[idx + 2] = value;

          // Atkinson matrix (only diffuses 3/4 of error)
          if (x + 1 < width) errors[(y * width + x + 1) * 3] += error;
          if (x + 2 < width) errors[(y * width + x + 2) * 3] += error;
          if (y + 1 < height) {
            if (x > 0) errors[((y + 1) * width + x - 1) * 3] += error;
            errors[((y + 1) * width + x) * 3] += error;
            if (x + 1 < width) errors[((y + 1) * width + x + 1) * 3] += error;
          }
          if (y + 2 < height) {
            errors[((y + 2) * width + x) * 3] += error;
          }
        } else {
          // Color dithering - optimized to process RGB together
          if (paletteColors) {
            const oldR = data[idx] + errors[errIdx];
            const oldG = data[idx + 1] + errors[errIdx + 1];
            const oldB = data[idx + 2] + errors[errIdx + 2];

            const [newR, newG, newB] = findNearestPaletteColor(oldR, oldG, oldB);

            const errorR = (oldR - newR) / 8;
            const errorG = (oldG - newG) / 8;
            const errorB = (oldB - newB) / 8;

            data[idx] = newR;
            data[idx + 1] = newG;
            data[idx + 2] = newB;

            // Distribute error (Atkinson)
            if (x + 1 < width) {
              const idx1 = (y * width + x + 1) * 3;
              errors[idx1] += errorR;
              errors[idx1 + 1] += errorG;
              errors[idx1 + 2] += errorB;
            }
            if (x + 2 < width) {
              const idx2 = (y * width + x + 2) * 3;
              errors[idx2] += errorR;
              errors[idx2 + 1] += errorG;
              errors[idx2 + 2] += errorB;
            }
            if (y + 1 < height) {
              if (x > 0) {
                const idxBL = ((y + 1) * width + x - 1) * 3;
                errors[idxBL] += errorR;
                errors[idxBL + 1] += errorG;
                errors[idxBL + 2] += errorB;
              }
              const idxB = ((y + 1) * width + x) * 3;
              errors[idxB] += errorR;
              errors[idxB + 1] += errorG;
              errors[idxB + 2] += errorB;
              if (x + 1 < width) {
                const idxBR = ((y + 1) * width + x + 1) * 3;
                errors[idxBR] += errorR;
                errors[idxBR + 1] += errorG;
                errors[idxBR + 2] += errorB;
              }
            }
            if (y + 2 < height) {
              const idxB2 = ((y + 2) * width + x) * 3;
              errors[idxB2] += errorR;
              errors[idxB2 + 1] += errorG;
              errors[idxB2 + 2] += errorB;
            }
          } else {
            for (let c = 0; c < 3; c++) {
              const oldPixel = data[idx + c] + errors[errIdx + c];
              const quantized = Math.round((oldPixel / 255) * (levels - 1)) / (levels - 1);
              const newPixel = Math.round(quantized * 255);
              const error = (oldPixel - newPixel) / 8;
              data[idx + c] = newPixel;

              // Distribute error (Atkinson)
              if (x + 1 < width) errors[(y * width + x + 1) * 3 + c] += error;
              if (x + 2 < width) errors[(y * width + x + 2) * 3 + c] += error;
              if (y + 1 < height) {
                if (x > 0) errors[((y + 1) * width + x - 1) * 3 + c] += error;
                errors[((y + 1) * width + x) * 3 + c] += error;
                if (x + 1 < width) errors[((y + 1) * width + x + 1) * 3 + c] += error;
              }
              if (y + 2 < height) {
                errors[((y + 2) * width + x) * 3 + c] += error;
              }
            }
          }
        }
      }
    }
  } else if (method === 'burkes') {
    // Burkes dithering - similar to Floyd-Steinberg but wider distribution
    const errors = new Float32Array(width * height * 3);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const errIdx = (y * width + x) * 3;

        if (colorMode === 'bw') {
          const gray = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114 + errors[errIdx]) / 255;
          const quantized = Math.round(gray * (levels - 1)) / (levels - 1);
          const value = Math.round(quantized * 255);
          const error = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) - value;

          data[idx] = data[idx + 1] = data[idx + 2] = value;

          // Burkes matrix
          if (x + 1 < width) errors[(y * width + x + 1) * 3] += error * 8 / 32;
          if (x + 2 < width) errors[(y * width + x + 2) * 3] += error * 4 / 32;
          if (y + 1 < height) {
            if (x > 1) errors[((y + 1) * width + x - 2) * 3] += error * 2 / 32;
            if (x > 0) errors[((y + 1) * width + x - 1) * 3] += error * 4 / 32;
            errors[((y + 1) * width + x) * 3] += error * 8 / 32;
            if (x + 1 < width) errors[((y + 1) * width + x + 1) * 3] += error * 4 / 32;
            if (x + 2 < width) errors[((y + 1) * width + x + 2) * 3] += error * 2 / 32;
          }
        } else {
          // Color dithering - optimized to process RGB together
          if (paletteColors) {
            const oldR = data[idx] + errors[errIdx];
            const oldG = data[idx + 1] + errors[errIdx + 1];
            const oldB = data[idx + 2] + errors[errIdx + 2];

            const [newR, newG, newB] = findNearestPaletteColor(oldR, oldG, oldB);

            const errorR = oldR - newR;
            const errorG = oldG - newG;
            const errorB = oldB - newB;

            data[idx] = newR;
            data[idx + 1] = newG;
            data[idx + 2] = newB;

            // Distribute error (Burkes)
            if (x + 1 < width) {
              const idx1 = (y * width + x + 1) * 3;
              errors[idx1] += errorR * 8 / 32;
              errors[idx1 + 1] += errorG * 8 / 32;
              errors[idx1 + 2] += errorB * 8 / 32;
            }
            if (x + 2 < width) {
              const idx2 = (y * width + x + 2) * 3;
              errors[idx2] += errorR * 4 / 32;
              errors[idx2 + 1] += errorG * 4 / 32;
              errors[idx2 + 2] += errorB * 4 / 32;
            }
            if (y + 1 < height) {
              if (x > 1) {
                const idxBL2 = ((y + 1) * width + x - 2) * 3;
                errors[idxBL2] += errorR * 2 / 32;
                errors[idxBL2 + 1] += errorG * 2 / 32;
                errors[idxBL2 + 2] += errorB * 2 / 32;
              }
              if (x > 0) {
                const idxBL = ((y + 1) * width + x - 1) * 3;
                errors[idxBL] += errorR * 4 / 32;
                errors[idxBL + 1] += errorG * 4 / 32;
                errors[idxBL + 2] += errorB * 4 / 32;
              }
              const idxB = ((y + 1) * width + x) * 3;
              errors[idxB] += errorR * 8 / 32;
              errors[idxB + 1] += errorG * 8 / 32;
              errors[idxB + 2] += errorB * 8 / 32;
              if (x + 1 < width) {
                const idxBR = ((y + 1) * width + x + 1) * 3;
                errors[idxBR] += errorR * 4 / 32;
                errors[idxBR + 1] += errorG * 4 / 32;
                errors[idxBR + 2] += errorB * 4 / 32;
              }
              if (x + 2 < width) {
                const idxBR2 = ((y + 1) * width + x + 2) * 3;
                errors[idxBR2] += errorR * 2 / 32;
                errors[idxBR2 + 1] += errorG * 2 / 32;
                errors[idxBR2 + 2] += errorB * 2 / 32;
              }
            }
          } else {
            for (let c = 0; c < 3; c++) {
              const oldPixel = data[idx + c] + errors[errIdx + c];
              const quantized = Math.round((oldPixel / 255) * (levels - 1)) / (levels - 1);
              const newPixel = Math.round(quantized * 255);
              const error = oldPixel - newPixel;
              data[idx + c] = newPixel;

              // Distribute error (Burkes)
              if (x + 1 < width) errors[(y * width + x + 1) * 3 + c] += error * 8 / 32;
              if (x + 2 < width) errors[(y * width + x + 2) * 3 + c] += error * 4 / 32;
              if (y + 1 < height) {
                if (x > 1) errors[((y + 1) * width + x - 2) * 3 + c] += error * 2 / 32;
                if (x > 0) errors[((y + 1) * width + x - 1) * 3 + c] += error * 4 / 32;
                errors[((y + 1) * width + x) * 3 + c] += error * 8 / 32;
                if (x + 1 < width) errors[((y + 1) * width + x + 1) * 3 + c] += error * 4 / 32;
                if (x + 2 < width) errors[((y + 1) * width + x + 2) * 3 + c] += error * 2 / 32;
              }
            }
          }
        }
      }
    }
  }

  targetCtx.putImageData(imageData, 0, 0);
}