// Shared Canvas Utilities
// Common canvas operations used by both photo editor and camera

// Canvas pooling for memory management
const canvasPool: HTMLCanvasElement[] = [];
const MAX_POOL_SIZE = 10;

export function getTempCanvas(width: number, height: number): HTMLCanvasElement {
  let canvas = canvasPool.pop();
  if (!canvas) {
    canvas = document.createElement('canvas');
  }
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function releaseTempCanvas(canvas: HTMLCanvasElement): void {
  if (canvasPool.length < MAX_POOL_SIZE) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    canvasPool.push(canvas);
  }
}

// Simple noise generation for grain effect
export function generateNoiseCanvas(width: number, height: number, intensity: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const amp = Math.min(1, Math.max(0, intensity));

  for (let i = 0; i < data.length; i += 4) {
    const val = Math.round((Math.random() * 255) * amp);
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}