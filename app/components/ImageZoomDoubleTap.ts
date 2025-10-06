"use client";

import React from "react";
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
  const animationRef = React.useRef<number | null>(null);

  const animateTo = (
    targetScale: number,
    targetTx: number,
    targetTy: number,
    duration: number = 300
  ) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startScale = scale;
    const startTx = tx;
    const startTy = ty;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      const currentScale = startScale + (targetScale - startScale) * easeProgress;
      const currentTx = startTx + (targetTx - startTx) * easeProgress;
      const currentTy = startTy + (targetTy - startTy) * easeProgress;

      setScale(currentScale);
      setTx(currentTx);
      setTy(currentTy);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const reset = () => {
    const bounds = getBoundsForScale(1, containerRef, imgRef, natural);
    animateTo(1, 0, 0);
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monolog:zoom_end'));
      } catch (_) {}
    }
  };

  const handleDoubleTap = (clientX: number, clientY: number) => {
    const targetScale = scale > 1.1 ? 1 : Math.min(2, maxScale);

    if (targetScale === 1) {
      reset();
      return;
    }

    // Calculate the local point in the container
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    // Calculate new translation to keep the tap point centered
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    const newTx = -(localX * targetScale - containerWidth / 2);
    const newTy = -(localY * targetScale - containerHeight / 2);

    // Clamp to bounds
    const bounds = getBoundsForScale(targetScale, containerRef, imgRef, natural);
    const clampedTx = clamp(newTx, -bounds.maxTx, bounds.maxTx);
    const clampedTy = clamp(newTy, -bounds.maxTy, bounds.maxTy);

    animateTo(targetScale, clampedTx, clampedTy);

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monolog:zoom_start'));
      } catch (_) {}
    }

    lastDoubleTapAt.current = Date.now();
  };

  const handleTouchEndDoubleTap = (e: React.TouchEvent) => {
    if (e.changedTouches.length !== 1) return;

    const touch = e.changedTouches[0];
    const now = Date.now();

    if (doubleTapRef.current && now - doubleTapRef.current < 400) {
      doubleTapRef.current = null;
      handleDoubleTap(touch.clientX, touch.clientY);
    } else {
      doubleTapRef.current = now;
      setTimeout(() => {
        if (doubleTapRef.current === now) {
          doubleTapRef.current = null;
        }
      }, 450);
    }
  };

  React.useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return { handleDoubleTap, handleTouchEndDoubleTap };
}
