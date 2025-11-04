/**
 * Camera Effects - Real-time video frame processing
 * 
 * Simplified, performance-optimized versions of image editor effects
 * designed for real-time application to video streams.
 * 
 * Performance considerations:
 * - Algorithms optimized for 30fps+ processing
 * - Ordered dithering preferred over Floyd-Steinberg for speed
 * - Efficient pixel sampling and iteration patterns
 * - Direct canvas manipulation for maximum performance
 */

// Real-time camera effects for live video preview
// Simplified versions of image editor effects optimized for video frames

export type CameraEffectType = 'none' | 'dither' | 'pixelate' | 'ascii';

export interface CameraEffectSettings {
  type: CameraEffectType;
  // Pixelate settings
  pixelSize?: number;
  pixelShape?: 'square' | 'circle';
  // Dither settings
  ditherMethod?: 'floyd-steinberg' | 'ordered' | 'atkinson' | 'burkes';
  ditherLevels?: number;
  ditherColorMode?: 'bw' | 'color';
  ditherPalette?: 'auto' | 'gameboy' | 'pico8' | 'nes' | 'zx_spectrum' | 'atari_2600' | 'commodore64' | 'apple_ii';
  // ASCII settings
  asciiCellSize?: number;
  asciiCharset?: string;
  asciiInvert?: boolean;
  asciiCharsetPreset?: 'custom' | 'dense' | 'medium' | 'sparse' | 'blocks' | 'dots' | 'lines' | 'numbers' | 'letters';
}

const DEFAULT_ASCII_CHARSET = ' .:-=+*#%@';

// Apply pixelation effect to video frame
export function applyPixelateToFrame(
  sourceCtx: CanvasRenderingContext2D,
  targetCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pixelSize: number = 8,
  shape: 'square' | 'circle' = 'square'
): void {
  if (pixelSize <= 1) {
    targetCtx.drawImage(sourceCtx.canvas, 0, 0, width, height);
    return;
  }

  const cols = Math.ceil(width / pixelSize);
  const rows = Math.ceil(height / pixelSize);

  targetCtx.clearRect(0, 0, width, height);

  if (shape === 'square') {
    // Simple block pixelation
    const imageData = sourceCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Sample center pixel of block
        const x = Math.min(col * pixelSize + Math.floor(pixelSize / 2), width - 1);
        const y = Math.min(row * pixelSize + Math.floor(pixelSize / 2), height - 1);
        const idx = (y * width + x) * 4;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        targetCtx.fillStyle = `rgb(${r},${g},${b})`;
        targetCtx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
      }
    }
  } else {
    // Circle pixelation
    const imageData = sourceCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = Math.min(col * pixelSize + Math.floor(pixelSize / 2), width - 1);
        const y = Math.min(row * pixelSize + Math.floor(pixelSize / 2), height - 1);
        const idx = (y * width + x) * 4;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        targetCtx.fillStyle = `rgb(${r},${g},${b})`;
        targetCtx.beginPath();
        targetCtx.arc(
          col * pixelSize + pixelSize / 2,
          row * pixelSize + pixelSize / 2,
          pixelSize / 2,
          0,
          Math.PI * 2
        );
        targetCtx.fill();
      }
    }
  }
}

// Color palettes for dithering
const COLOR_PALETTES: Record<string, number[][]> = {
  gameboy: [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]],
  pico8: [[0,0,0],[29,43,83],[126,37,83],[0,135,81],[171,82,54],[95,87,79],[194,195,199],[255,241,232],[255,0,77],[255,163,0],[255,236,39],[0,228,54],[41,173,255],[131,118,156],[255,119,168],[255,204,170]],
  nes: [[124,124,124],[0,0,252],[0,0,188],[68,40,188],[148,0,132],[168,0,32],[168,16,0],[136,20,0],[80,48,0],[0,120,0],[0,104,0],[0,88,0],[0,64,88],[0,0,0],[188,188,188],[0,120,248],[0,88,248],[104,68,252],[216,0,204],[228,0,88],[248,56,0],[228,92,16],[172,124,0],[0,184,0],[0,168,0],[0,168,68],[0,136,136],[0,0,0],[248,248,248],[60,188,252],[104,136,252],[152,120,248],[248,120,248],[248,88,152],[248,120,88],[252,160,68],[248,184,0],[184,248,24],[88,216,84],[88,248,152],[0,232,216],[120,120,120],[252,252,252],[164,228,252],[184,184,248],[216,184,248],[248,184,248],[248,164,192],[240,208,176],[252,224,168],[248,216,120],[216,248,120],[184,248,184],[184,248,216],[0,252,252],[216,216,216]],
  zx_spectrum: [[0,0,0],[0,0,192],[192,0,0],[192,0,192],[0,192,0],[0,192,192],[192,192,0],[192,192,192],[0,0,0],[0,0,255],[255,0,0],[255,0,255],[0,255,0],[0,255,255],[255,255,0],[255,255,255]],
  atari_2600: [[0,0,0],[68,68,0],[112,40,0],[132,24,0],[136,0,0],[120,0,92],[72,0,120],[20,0,132],[0,0,136],[0,24,124],[0,44,92],[0,60,44],[0,60,0],[20,56,0],[44,48,0],[68,40,0]],
  commodore64: [[0,0,0],[255,255,255],[136,0,0],[170,255,238],[204,68,204],[0,204,85],[0,0,170],[238,238,119],[221,136,85],[102,68,0],[255,119,119],[51,51,51],[119,119,119],[170,255,102],[0,136,255],[187,187,187]],
  apple_ii: [[0,0,0],[114,38,64],[64,51,127],[228,52,254],[14,89,64],[128,128,128],[27,154,254],[191,179,255],[64,76,0],[241,106,0],[128,128,128],[255,129,236],[27,203,1],[191,204,136],[141,217,191],[255,255,255]],
};

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
  const imageData = sourceCtx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Get color palette if using color mode with specific palette
  const usePalette = colorMode === 'color' && palette !== 'auto' && COLOR_PALETTES[palette];
  const paletteColors = usePalette ? COLOR_PALETTES[palette] : null;

  // Helper function to find nearest palette color
  const findNearestPaletteColor = (r: number, g: number, b: number): [number, number, number] => {
    if (!paletteColors) return [r, g, b];
    
    let minDist = Infinity;
    let nearestColor: [number, number, number] = [r, g, b];
    
    for (const pColor of paletteColors) {
      const dist = Math.sqrt(
        Math.pow(r - pColor[0], 2) +
        Math.pow(g - pColor[1], 2) +
        Math.pow(b - pColor[2], 2)
      );
      if (dist < minDist) {
        minDist = dist;
        nearestColor = [pColor[0], pColor[1], pColor[2]];
      }
    }
    
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
            // Quantize to palette
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
          for (let c = 0; c < 3; c++) {
            const oldPixel = data[idx + c] + errors[errIdx + c];
            let newPixel: number;
            
            if (paletteColors) {
              const tempR = c === 0 ? oldPixel : data[idx];
              const tempG = c === 1 ? oldPixel : data[idx + 1];
              const tempB = c === 2 ? oldPixel : data[idx + 2];
              const [nr, ng, nb] = findNearestPaletteColor(
                Math.max(0, Math.min(255, tempR)),
                Math.max(0, Math.min(255, tempG)),
                Math.max(0, Math.min(255, tempB))
              );
              newPixel = c === 0 ? nr : c === 1 ? ng : nb;
            } else {
              const quantized = Math.round((oldPixel / 255) * (levels - 1)) / (levels - 1);
              newPixel = Math.round(quantized * 255);
            }
            
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
          for (let c = 0; c < 3; c++) {
            const oldPixel = data[idx + c] + errors[errIdx + c];
            let newPixel: number;
            
            if (paletteColors) {
              const tempR = c === 0 ? oldPixel : data[idx];
              const tempG = c === 1 ? oldPixel : data[idx + 1];
              const tempB = c === 2 ? oldPixel : data[idx + 2];
              const [nr, ng, nb] = findNearestPaletteColor(
                Math.max(0, Math.min(255, tempR)),
                Math.max(0, Math.min(255, tempG)),
                Math.max(0, Math.min(255, tempB))
              );
              newPixel = c === 0 ? nr : c === 1 ? ng : nb;
            } else {
              const quantized = Math.round((oldPixel / 255) * (levels - 1)) / (levels - 1);
              newPixel = Math.round(quantized * 255);
            }
            
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
          for (let c = 0; c < 3; c++) {
            const oldPixel = data[idx + c] + errors[errIdx + c];
            let newPixel: number;
            
            if (paletteColors) {
              const tempR = c === 0 ? oldPixel : data[idx];
              const tempG = c === 1 ? oldPixel : data[idx + 1];
              const tempB = c === 2 ? oldPixel : data[idx + 2];
              const [nr, ng, nb] = findNearestPaletteColor(
                Math.max(0, Math.min(255, tempR)),
                Math.max(0, Math.min(255, tempG)),
                Math.max(0, Math.min(255, tempB))
              );
              newPixel = c === 0 ? nr : c === 1 ? ng : nb;
            } else {
              const quantized = Math.round((oldPixel / 255) * (levels - 1)) / (levels - 1);
              newPixel = Math.round(quantized * 255);
            }
            
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

  targetCtx.putImageData(imageData, 0, 0);
}

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
        settings.asciiCharset || DEFAULT_ASCII_CHARSET,
        settings.asciiInvert || false
      );
      break;

    case 'none':
    default:
      targetCtx.drawImage(sourceCanvas, 0, 0, width, height);
      break;
  }
}
