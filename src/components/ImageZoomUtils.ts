"use client";

export const clamp = (v: number, a = -Infinity, b = Infinity) => Math.max(a, Math.min(b, v));

export function getBoundsForScale(
  scale: number,
  containerRef: React.RefObject<HTMLDivElement>,
  imgRef: React.RefObject<HTMLImageElement>,
  natural: React.MutableRefObject<{ w: number; h: number }>
) {
  const c = containerRef.current;
  const img = imgRef.current;
  if (!c || !img) return { maxTx: 0, maxTy: 0, containerW: 0, containerH: 0 };
  const rect = c.getBoundingClientRect();
  const containerW = rect.width;
  const containerH = rect.height;
  const natW = img.naturalWidth || natural.current.w || containerW;
  const natH = img.naturalHeight || natural.current.h || containerH;
  // image is rendered at width = containerW, height scaled by natural aspect ratio
  const baseW = containerW;
  const baseH = baseW * (natH / Math.max(1, natW));
  const scaledW = baseW * scale;
  const scaledH = baseH * scale;
  const maxTx = Math.max(0, (scaledW - containerW) / 2);
  const maxTy = Math.max(0, (scaledH - containerH) / 2);
  return { maxTx, maxTy, containerW, containerH };
}

// Accept React.Touch or native Touch to satisfy React types in event handlers
export function getTouchDist(t0: any, t1: any) {
  const dx = t0.clientX - t1.clientX;
  const dy = t0.clientY - t1.clientY;
  return Math.hypot(dx, dy);
}

export function getCentroid(t0: any, t1: any) {
  return {
    x: (t0.clientX + t1.clientX) / 2,
    y: (t0.clientY + t1.clientY) / 2,
  };
}

export function toLocalPoint(clientX: number, clientY: number, containerRef: React.RefObject<HTMLDivElement>) {
  const el = containerRef.current;
  if (!el) return { x: 0, y: 0 };
  const r = el.getBoundingClientRect();
  return { x: clientX - r.left - r.width / 2, y: clientY - r.top - r.height / 2 };
}