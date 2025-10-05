"use client";

import React from "react";
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
  // Local refs to track an active single-touch pan. Use React refs so
  // values persist across re-renders (setTxSafe triggers renders).
  const activeId = React.useRef<number>(-1);
  const startTouch = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startTx = React.useRef<number>(0);
  const startTy = React.useRef<number>(0);
  const lastMove = React.useRef<{ x: number; y: number; t: number }>({ x: 0, y: 0, t: 0 });
  const velocity = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const reset = () => {
    setScale(1);
    // Animate back to center instead of jumping
    const targetTx = 0;
    const targetTy = 0;
    const sTx = tx;
    const sTy = ty;
    const dur = 300;
    const start = performance.now();
    function step(now: number) {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      setTxSafe(sTx + (targetTx - sTx) * ease);
      setTySafe(sTy + (targetTy - sTy) * ease);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  const onTouchStart: React.TouchEventHandler = (e) => {
    if (!containerRef.current) return;
    // Only handle single-finger panning when zoomed
    if (scale <= 1) return;
    if (e.touches.length !== 1) {
      // ignore multi-touch (pinch) gestures
      activeId.current = -1;
      return;
    }

    const t = e.touches[0];
  activeId.current = t.identifier;
  startTouch.current.x = t.clientX;
  startTouch.current.y = t.clientY;
  startTx.current = tx;
  startTy.current = ty;
  lastMove.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  velocity.current = { x: 0, y: 0 };
  // Prevent parent gestures (carousel swipe). touch-action CSS will
  // prevent native scrolling when scale > 1, so avoid calling
  // preventDefault here (passive listener warning in some browsers).
  e.stopPropagation();
  };

  const onTouchMove: React.TouchEventHandler = (e) => {
    if (!containerRef.current) return;
    if (scale <= 1) return;
  if (activeId.current === -1) return;
  // find the active touch
  const t = Array.from(e.touches).find((tt) => tt.identifier === activeId.current);
    if (!t) return;

    const curX = t.clientX;
    const curY = t.clientY;
  const dx = curX - startTouch.current.x;
  const dy = curY - startTouch.current.y;
    const b = getBoundsForScale(scale, containerRef, imgRef, natural);
    const nextTx = clamp(startTx.current + dx, -b.maxTx - 100, b.maxTx + 100);
    const nextTy = clamp(startTy.current + dy, -b.maxTy - 100, b.maxTy + 100);

    setTxSafe(nextTx);
    setTySafe(nextTy);

    // velocity tracking
    const now = Date.now();
    const dt = Math.max(1, now - lastMove.current.t) / 1000;
    velocity.current = {
      x: (curX - lastMove.current.x) / dt,
      y: (curY - lastMove.current.y) / dt,
    };
    lastMove.current = { x: curX, y: curY, t: now };

  // stop propagation so parent carousels don't receive the move
  e.stopPropagation();
  };

  const onTouchEnd: React.TouchEventHandler = (e) => {
    if (!containerRef.current) return;
    if (scale <= 1) return;

    // If there are still other touches active, abort
    if (e.touches && e.touches.length > 0) {
      activeId.current = -1;
      return;
    }

    // Simple fling: if velocity is large, animate a decaying movement
  const v = velocity.current;
    const speed = Math.hypot(v.x, v.y);
    if (speed > 400) {
      const decay = 0.95;
      let currVx = v.x;
      let currVy = v.y;
      let prev = performance.now();
      function frame(now: number) {
        const dt = Math.max(0, (now - prev) / 1000);
        prev = now;
  const nextTx = startTx.current + currVx * dt;
  const nextTy = startTy.current + currVy * dt;
        const b = getBoundsForScale(scale, containerRef, imgRef, natural);
        const softX = b.maxTx + 100;
        const softY = b.maxTy + 100;
        const clampedTx = clamp(nextTx, -softX, softX);
        const clampedTy = clamp(nextTy, -softY, softY);
        setTxSafe(clampedTx);
        setTySafe(clampedTy);
        currVx *= Math.pow(decay, dt * 60);
        currVy *= Math.pow(decay, dt * 60);
        if (Math.hypot(currVx, currVy) < 20) {
          // spring back into bounds
          const bb = getBoundsForScale(scale, containerRef, imgRef, natural);
          setTxSafe((t) => clamp(t, -bb.maxTx, bb.maxTx));
          setTySafe((t) => clamp(t, -bb.maxTy, bb.maxTy));
          return;
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    } else {
      // no fling: just spring back to bounds
      const b = getBoundsForScale(scale, containerRef, imgRef, natural);
      setTxSafe((t) => clamp(t, -b.maxTx, b.maxTx));
      setTySafe((t) => clamp(t, -b.maxTy, b.maxTy));
    }

  activeId.current = -1;
  // prevent parent handlers from acting on the touch end
  e.stopPropagation();
  };

  return { onTouchStart, onTouchMove, onTouchEnd, reset };
}
