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
  // Calculate the scale factor to fit the image within the container with objectFit: contain
  const fitScale = Math.min(containerW / natW, containerH / natH);
  const renderedW = natW * fitScale;
  const renderedH = natH * fitScale;
  // When zoomed with transform: scale(scale), the effective size
  const scaledW = renderedW * scale;
  const scaledH = renderedH * scale;
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
