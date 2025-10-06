"use client";

import { clamp, getBoundsForScale } from "./ImageZoomUtils";

export function useImageZoomPointer(
  scale: number,
  scaleRef: React.MutableRefObject<number>,
  txRef: React.MutableRefObject<number>,
  tyRef: React.MutableRefObject<number>,
  setTxSafe: (v: number | ((prev: number) => number)) => void,
  setTySafe: (v: number | ((prev: number) => number)) => void,
  setIsPanning: (panning: boolean) => void,
  lastPan: React.MutableRefObject<{ x: number; y: number }>,
  startPan: React.MutableRefObject<{ x: number; y: number }>,
  lastMoveTs: React.MutableRefObject<number | null>,
  lastMovePos: React.MutableRefObject<{ x: number; y: number }>,
  velocity: React.MutableRefObject<{ x: number; y: number }>,
  pointerActive: React.MutableRefObject<boolean>,
  pointerRaf: React.MutableRefObject<number | null>,
  containerRef: React.RefObject<HTMLDivElement>,
  imgRef: React.RefObject<HTMLImageElement>,
  natural: React.MutableRefObject<{ w: number; h: number }>
) {
  const reset = () => {
    // Animate back to center instead of jumping
    const targetTx = 0;
    const targetTy = 0;
    const startTx = txRef.current;
    const startTy = tyRef.current;
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

  const springBack = () => {
    // animate tx/ty back within hard bounds
    const b = getBoundsForScale(scale, containerRef, imgRef, natural);
    const targetTx = clamp(txRef.current, -b.maxTx, b.maxTx);
    const targetTy = clamp(tyRef.current, -b.maxTy, b.maxTy);
    const startTx = txRef.current;
    const startTy = tyRef.current;
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

  const startFling = (vx: number, vy: number) => {
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
      // clamp to hard bounds
      const clampedTx = clamp(nextTx, -b.maxTx, b.maxTx);
      const clampedTy = clamp(nextTy, -b.maxTy, b.maxTy);
      setTxSafe(clampedTx);
      setTySafe(clampedTy);
      // apply decay
      currVx *= Math.pow(decay, dt * 60);
      currVy *= Math.pow(decay, dt * 60);
      // if hit hard bounds, dampen velocity
      if (clampedTx >= b.maxTx || clampedTx <= -b.maxTx) currVx *= 0.5;
      if (clampedTy >= b.maxTy || clampedTy <= -b.maxTy) currVy *= 0.5;
      // stop conditions
      if (Math.hypot(currVx, currVy) < 20) {
        // spring back into bounds if necessary (though already clamped)
        springBack();
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };

  // Mouse / pointer pan support (when zoomed)
  const onPointerDown: React.PointerEventHandler = (e) => {
    // Ignore touch pointer events here to avoid one-finger panning on touch
    // devices; only allow pointer-based panning for mouse/pen.
    if (scale <= 1) return;
    if ((e as any).pointerType === 'touch') return;
    const target = containerRef.current || (e.target as Element);
    target.setPointerCapture?.(e.pointerId);
    pointerActive.current = true;
    setIsPanning(true);
    lastPan.current = { x: txRef.current, y: tyRef.current };
    startPan.current = { x: e.clientX, y: e.clientY };
    lastMovePos.current = { x: e.clientX, y: e.clientY };
    lastMoveTs.current = Date.now();
    velocity.current = { x: 0, y: 0 };
  };

  const onPointerMove: React.PointerEventHandler = (e) => {
    // ignore touch pointer moves (we only want mouse/pen panning here)
    if ((e as any).pointerType === 'touch') return;
    if (!pointerActive.current) return;
    e.preventDefault();
    const cur = { x: e.clientX, y: e.clientY };
    const dx = cur.x - startPan.current.x;
    const dy = cur.y - startPan.current.y;
    const b = getBoundsForScale(scale, containerRef, imgRef, natural);
    const nextTx = clamp(lastPan.current.x + dx, -b.maxTx, b.maxTx);
    const nextTy = clamp(lastPan.current.y + dy, -b.maxTy, b.maxTy);
    
    // Use requestAnimationFrame for smoother updates
    if (!pointerRaf.current) {
      pointerRaf.current = requestAnimationFrame(() => {
        setTxSafe(nextTx);
        setTySafe(nextTy);
        pointerRaf.current = null;
      });
    }

    // velocity tracking
    const now = Date.now();
    if (lastMoveTs.current) {
      const dt = Math.max(1, now - lastMoveTs.current) / 1000;
      const vx = (cur.x - lastMovePos.current.x) / dt;
      const vy = (cur.y - lastMovePos.current.y) / dt;
      velocity.current = { x: vx, y: vy };
    }
    lastMoveTs.current = now;
    lastMovePos.current = cur;
  };

  const onPointerUp: React.PointerEventHandler = (e) => {
    // ignore touch pointer ups
    if ((e as any).pointerType === 'touch') return;
    const target = containerRef.current || (e.target as Element);
    try { target.releasePointerCapture?.(e.pointerId); } catch (_) {}
    pointerActive.current = false;
    setIsPanning(false);
    
    // Cancel any pending RAF update
    if (pointerRaf.current) {
      cancelAnimationFrame(pointerRaf.current);
      pointerRaf.current = null;
    }
    
    // check velocity and fling
    const v = velocity.current;
    const speed = Math.hypot(v.x, v.y);
    if (speed > 400) startFling(v.x, v.y);
    else {
      if (scaleRef.current <= 1.05) reset();
      else springBack();
    }
  };

  return { onPointerDown, onPointerMove, onPointerUp, springBack, startFling };
}
