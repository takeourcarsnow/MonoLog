// Simple reusable canvas/OffscreenCanvas pool to avoid frequent DOM allocations
const pool: Map<string, Array<HTMLCanvasElement | OffscreenCanvas>> = new Map();

export function getTempCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  const key = `${Math.max(1, Math.round(w))}x${Math.max(1, Math.round(h))}`;
  const arr = pool.get(key) || [];
  if (arr.length > 0) {
    return arr.pop() as HTMLCanvasElement | OffscreenCanvas;
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))) as any as OffscreenCanvas;
  }
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function releaseTempCanvas(canvas: HTMLCanvasElement | OffscreenCanvas) {
  try {
    const w = (canvas as any).width || 1;
    const h = (canvas as any).height || 1;
    const key = `${Math.max(1, Math.round(w))}x${Math.max(1, Math.round(h))}`;
    const arr = pool.get(key) || [];
    // limit stored canvases per size to avoid unbounded memory
    if (arr.length < 4) arr.push(canvas);
    pool.set(key, arr);
  } catch (e) {
    // ignore
  }
}
