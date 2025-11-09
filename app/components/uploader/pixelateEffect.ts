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