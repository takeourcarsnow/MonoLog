"use client";

import { clamp, getBoundsForScale } from "./ImageZoomUtils";

export function useImageZoomAnimation(
  scale: number,
  scaleRef: React.MutableRefObject<number>,
  txRef: React.MutableRefObject<number>,
  tyRef: React.MutableRefObject<number>,
  setTxSafe: (v: number | ((prev: number) => number)) => void,
  setTySafe: (v: number | ((prev: number) => number)) => void,
  setScale: (scale: number) => void,
  containerRef: React.RefObject<HTMLDivElement>,
  imgRef: React.RefObject<HTMLImageElement>,
  natural: React.MutableRefObject<{ w: number; h: number }>,
  flingRaf: React.MutableRefObject<number | null>
) {
  const reset = () => {
    setScale(1);
    setTxSafe(0);
    setTySafe(0);
  };

  const springBack = () => {
    // animate tx/ty back within hard bounds
    const b = getBoundsForScale(scale, containerRef, imgRef, natural);
    const targetTx = clamp(txRef.current, -b.maxTx, b.maxTx);
    const targetTy = clamp(tyRef.current, -b.maxTy, b.maxTy);
    const startTx = txRef.current;
    const startTy = tyRef.current;
    const dur = 300;
    const start = performance.now();
    if (flingRaf.current) cancelAnimationFrame(flingRaf.current);
    function step(now: number) {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      setTxSafe(startTx + (targetTx - startTx) * ease);
      setTySafe(startTy + (targetTy - startTy) * ease);
      if (t < 1) flingRaf.current = requestAnimationFrame(step);
      else flingRaf.current = null;
    }
    flingRaf.current = requestAnimationFrame(step);
  };

  const startFling = (vx: number, vy: number) => {
    if (flingRaf.current) cancelAnimationFrame(flingRaf.current);
    const decay = 0.95; // per frame multiplier
    let currVx = vx;
    let currVy = vy;
    let prev = performance.now();
    function frame(now: number) {
      const dt = Math.max(0, (now - prev) / 1000);
      prev = now;
      // move
      const nextTx = txRef.current + currVx * dt;
      const nextTy = tyRef.current + currVy * dt;
      const b = getBoundsForScale(scale, containerRef, imgRef, natural);
      // allow small overshoot
      const softX = b.maxTx + 100;
      const softY = b.maxTy + 100;
      const clampedTx = clamp(nextTx, -softX, softX);
      const clampedTy = clamp(nextTy, -softY, softY);
      setTxSafe(clampedTx);
      setTySafe(clampedTy);
      // apply decay
      currVx *= Math.pow(decay, dt * 60);
      currVy *= Math.pow(decay, dt * 60);
      // if hit hard bounds, dampen velocity
      if (clampedTx > b.maxTx || clampedTx < -b.maxTx) currVx *= 0.5;
      if (clampedTy > b.maxTy || clampedTy < -b.maxTy) currVy *= 0.5;
      // stop conditions
      if (Math.hypot(currVx, currVy) < 20) {
        flingRaf.current = null;
        // spring back into bounds if necessary
        springBack();
        return;
      }
      flingRaf.current = requestAnimationFrame(frame);
    }
    flingRaf.current = requestAnimationFrame(frame);
  };

  return { springBack, startFling, reset };
}