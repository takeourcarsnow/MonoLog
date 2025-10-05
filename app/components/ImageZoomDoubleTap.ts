"use client";

import { clamp, toLocalPoint, getBoundsForScale } from "./ImageZoomUtils";

export function useImageZoomDoubleTap(
  scale: number,
  setScale: (scale: number) => void,
  tx: number,
  ty: number,
  setTx: (tx: number | ((prev: number) => number)) => void,
  setTy: (ty: number | ((prev: number) => number)) => void,
  maxScale: number,
  doubleTapRef: React.MutableRefObject<number | null>,
  containerRef: React.RefObject<HTMLDivElement>,
  imgRef: React.RefObject<HTMLImageElement>,
  natural: React.MutableRefObject<{ w: number; h: number }>,
  lastDoubleTapAt: React.MutableRefObject<number | null>
) {
  const reset = () => {
    setScale(1);
    // Animate back to center instead of jumping
    const b = getBoundsForScale(1, containerRef, imgRef, natural);
    const targetTx = 0;
    const targetTy = 0;
    const startTx = tx;
    const startTy = ty;
    const dur = 300;
    const start = performance.now();
    function step(now: number) {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      setTx(startTx + (targetTx - startTx) * ease);
      setTy(startTy + (targetTy - startTy) * ease);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  const handleDoubleTap = (clientX: number, clientY: number) => {
    // toggle between 1 and 2x (or maxScale if smaller)
    const target = scale > 1.1 ? 1 : Math.min(2, maxScale);
    if (target === 1) {
      reset();
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_end')); } catch (_) {}
      return;
    }
    // focus on tap point: compute offset so tapped point stays stable
    const local = toLocalPoint(clientX, clientY, containerRef);
    const newScale = target;
    const dx = local.x * (1 - newScale / scale);
    const dy = local.y * (1 - newScale / scale);
    setScale(newScale);
    const b = getBoundsForScale(newScale, containerRef, imgRef, natural);
    setTx(t => clamp(t + dx, -b.maxTx, b.maxTx));
    setTy(t => clamp(t + dy, -b.maxTy, b.maxTy));
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_start')); } catch (_) {}
    lastDoubleTapAt.current = Date.now();
  };

  const handleTouchEndDoubleTap = (e: React.TouchEvent) => {
    // double-tap detection
    if (e.changedTouches.length === 1) {
      const t = Date.now();
      if (doubleTapRef.current && t - doubleTapRef.current < 400) {
        // Prevent browser double-tap-to-zoom and avoid the default zooming behavior.
        try { e.preventDefault(); } catch (_) {}
        doubleTapRef.current = null;
        // If a parent requested double-tap to be handled, call it. Otherwise
        // fall back to default ImageZoom double-tap-to-zoom behavior.
        handleDoubleTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        lastDoubleTapAt.current = t;
      } else {
        doubleTapRef.current = t;
        setTimeout(() => { doubleTapRef.current = null; }, 450);
      }
    }
  };

  return { handleDoubleTap, handleTouchEndDoubleTap };
}
