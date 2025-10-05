"use client";

import { clamp, getTouchDist, getCentroid, toLocalPoint, getBoundsForScale } from "./ImageZoomUtils";

export function useImageZoomTouch(
  containerRef: React.RefObject<HTMLDivElement>,
  scale: number,
  setScale: (scale: number) => void,
  tx: number,
  ty: number,
  setTxSafe: (v: number | ((prev: number) => number)) => void,
  setTySafe: (v: number | ((prev: number) => number)) => void,
  maxScale: number,
  imgRef: React.RefObject<HTMLImageElement>,
  natural: React.MutableRefObject<{ w: number; h: number }>
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
      setTxSafe(startTx + (targetTx - startTx) * ease);
      setTySafe(startTy + (targetTy - startTy) * ease);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  const onTouchStart: React.TouchEventHandler = (e) => {
    if (!containerRef.current) return;
    // Pinch zoom disabled - only handle single touch for panning when zoomed
    if (scale > 1) {
      // When zoomed, prevent carousel swipe by stopping propagation
      e.stopPropagation();
    }
  };

  const onTouchMove: React.TouchEventHandler = (e) => {
    if (!containerRef.current) return;
    // Pinch zoom disabled - only prevent carousel swipe when zoomed
    if (scale > 1) {
      // When zoomed, prevent carousel swipe by stopping propagation
      e.stopPropagation();
    }
  };

  const onTouchEnd: React.TouchEventHandler = (e) => {
    if (!containerRef.current) return;
    if (scale > 1) {
      // When zoomed, prevent carousel swipe by stopping propagation
      e.stopPropagation();
    }
    // Pinch zoom disabled - no pinch end handling needed
  };

  return { onTouchStart, onTouchMove, onTouchEnd, reset };
}
