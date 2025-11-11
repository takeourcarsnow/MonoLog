/**
 * Pixelate Effect
 *
 * Applies pixelation effect to video frames with square or circle shapes
 */

// Apply pixelation effect to video frame
export function applyPixelateToFrame(
  sourceCtx: CanvasRenderingContext2D,
  targetCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pixelSize: number = 10,
  shape: 'square' | 'circle' = 'square'
): void {
  if (pixelSize < 10) {
    targetCtx.drawImage(sourceCtx.canvas, 0, 0, width, height);
    return;
  }

  const cols = Math.ceil(width / pixelSize);
  const rows = Math.ceil(height / pixelSize);
  targetCtx.clearRect(0, 0, width, height);

  // Use a small sampled canvas (cols x rows) to reduce expensive per-pixel sampling
  // then draw scaled blocks/circles to the target canvas.
  try {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cols;
    tempCanvas.height = rows;
    const tctx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tctx) {
      // Fallback to direct method
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
          if (shape === 'square') targetCtx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
          else {
            targetCtx.beginPath();
            targetCtx.arc(col * pixelSize + pixelSize / 2, row * pixelSize + pixelSize / 2, pixelSize / 2, 0, Math.PI * 2);
            targetCtx.fill();
          }
        }
      }
      return;
    }

    // Draw scaled down source into temp canvas
    tctx.drawImage(sourceCtx.canvas, 0, 0, sourceCtx.canvas.width, sourceCtx.canvas.height, 0, 0, cols, rows);
    const sampled = tctx.getImageData(0, 0, cols, rows).data;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = (r * cols + c) * 4;
        const cr = sampled[idx];
        const cg = sampled[idx + 1];
        const cb = sampled[idx + 2];
        targetCtx.fillStyle = `rgb(${cr},${cg},${cb})`;
        const x = c * pixelSize;
        const y = r * pixelSize;
        if (shape === 'square') {
          targetCtx.fillRect(x, y, pixelSize, pixelSize);
        } else {
          targetCtx.beginPath();
          targetCtx.arc(x + pixelSize / 2, y + pixelSize / 2, pixelSize / 2, 0, Math.PI * 2);
          targetCtx.fill();
        }
      }
    }
  } catch (e) {
    // Fallback - simple draw
    targetCtx.drawImage(sourceCtx.canvas, 0, 0, width, height);
  }
}