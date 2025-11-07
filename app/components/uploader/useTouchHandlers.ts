"use client";

import { useCallback } from "react";

interface UseTouchHandlersProps {
  pinchDistance: number;
  setPinchDistance: (distance: number) => void;
  setZoom: (zoom: (prev: number) => number) => void;
}

export function useTouchHandlers({ pinchDistance, setPinchDistance, setZoom }: UseTouchHandlersProps) {
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setPinchDistance(distance);
    }
  }, [setPinchDistance]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDistance > 0) {
      e.preventDefault(); // Prevent scrolling
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = distance / pinchDistance;
      setZoom(prev => Math.max(1, Math.min(5, prev * scale)));
      setPinchDistance(distance);
    }
  }, [pinchDistance, setPinchDistance, setZoom]);

  const handleTouchEnd = useCallback(() => {
    setPinchDistance(0);
  }, [setPinchDistance]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}