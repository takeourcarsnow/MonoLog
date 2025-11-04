/**
 * Frame Bounds Computation
 *
 * Utility for computing the bounds of inner transparent areas in frame images
 */

// Cache for frame bounds computation
const frameBoundsCache = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();

// Compute the bounds of the inner transparent area in a frame image
export function computeFrameBounds(img: HTMLImageElement): { minX: number; minY: number; maxX: number; maxY: number } {
  const cacheKey = img.src;
  const cached = frameBoundsCache.get(cacheKey);
  if (cached) return cached;

  const frameW = img.naturalWidth || img.width;
  const frameH = img.naturalHeight || img.height;

  const frameTemp = document.createElement('canvas');
  frameTemp.width = frameW;
  frameTemp.height = frameH;
  const fctx = frameTemp.getContext('2d')!;
  fctx.drawImage(img, 0, 0);
  const frameData = fctx.getImageData(0, 0, frameW, frameH);
  const data = frameData.data;

  const ALPHA_THRESHOLD = 16;
  const visited = new Uint8Array(frameW * frameH);
  const stack: number[] = [];

  // Start flood fill from borders
  for (let x = 0; x < frameW; x++) {
    stack.push(x, 0);
    stack.push(x, frameH - 1);
  }
  for (let y = 1; y < frameH - 1; y++) {
    stack.push(0, y);
    stack.push(frameW - 1, y);
  }

  while (stack.length > 0) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    if (x < 0 || x >= frameW || y < 0 || y >= frameH) continue;
    const idx = y * frameW + x;
    if (visited[idx]) continue;
    const alpha = data[(idx * 4) + 3];
    if (alpha <= ALPHA_THRESHOLD) {
      visited[idx] = 1;
      if (x > 0) stack.push(x - 1, y);
      if (x < frameW - 1) stack.push(x + 1, y);
      if (y > 0) stack.push(x, y - 1);
      if (y < frameH - 1) stack.push(x, y + 1);
    }
  }

  let minX = frameW, minY = frameH, maxX = -1, maxY = -1;
  for (let y = 0; y < frameH; y++) {
    for (let x = 0; x < frameW; x++) {
      const idx = y * frameW + x;
      const alpha = data[(idx * 4) + 3];
      const isOutside = visited[idx] === 1;
      if (alpha === 0 && !isOutside) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const bounds = { minX, minY, maxX, maxY };
  frameBoundsCache.set(cacheKey, bounds);
  return bounds;
}