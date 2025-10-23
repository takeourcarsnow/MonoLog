import { useCallback } from 'react';
import { getBounds } from '../utils/zoomUtils';

interface UsePointerEventsParams {
  scale: number;
  setIsPanning: (panning: boolean) => void;
  setIsTransitioning: (transitioning: boolean) => void;
  pointerStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  movedRef: React.MutableRefObject<boolean>;
  panStartRef: React.MutableRefObject<{ x: number; y: number; tx: number; ty: number } | null>;
  txRef: React.MutableRefObject<number>;
  tyRef: React.MutableRefObject<number>;
  isPanning: boolean;
  setTx: (tx: number) => void;
  setTy: (ty: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  imgRef: React.RefObject<HTMLImageElement>;
  naturalRef: React.MutableRefObject<{ w: number; h: number }>;
  containerRectRef: React.MutableRefObject<{ width: number; height: number } | null>;
  TAP_MOVE_THRESHOLD: number;
  registerTap: (clientX: number, clientY: number) => void;
}

export const usePointerEvents = ({
  scale,
  setIsPanning,
  setIsTransitioning,
  pointerStartRef,
  movedRef,
  panStartRef,
  txRef,
  tyRef,
  isPanning,
  setTx,
  setTy,
  containerRef,
  imgRef,
  naturalRef,
  containerRectRef,
  TAP_MOVE_THRESHOLD,
  registerTap,
}: UsePointerEventsParams) => {
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (scale <= 1) return;
    // record pointer start to distinguish tap vs drag
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;

    // Disable transitions during panning for instant response
    setIsTransitioning(false);
    setIsPanning(true);
    // Use the ref-backed tx/ty values here to ensure we capture the
    // most recent translation even if this callback was created earlier.
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx: txRef.current,
      ty: tyRef.current
    };

    // Dispatch pan start event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monolog:pan_start'));
      } catch (_) {}
    }

    e.preventDefault();
  }, [scale, setIsPanning, setIsTransitioning]);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // mark moved if movement exceeds threshold
    if (pointerStartRef.current) {
      const dxStart = e.clientX - pointerStartRef.current.x;
      const dyStart = e.clientY - pointerStartRef.current.y;
      if (!movedRef.current && Math.hypot(dxStart, dyStart) > TAP_MOVE_THRESHOLD) movedRef.current = true;
    }

    if (!isPanning || !panStartRef.current) return;

    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;

    const newTx = panStartRef.current.tx + dx;
    const newTy = panStartRef.current.ty + dy;

    const bounds = getBounds(containerRef, imgRef, naturalRef, scale, containerRectRef);
    const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
    const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

    setTx(clampedTx);
    setTy(clampedTy);

    // Prevent parent components from receiving swipe gestures when panning
    e.stopPropagation();
    e.preventDefault();
  }, [isPanning, TAP_MOVE_THRESHOLD, setTx, setTy, scale]);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const handlePointerUp = useCallback((e?: React.PointerEvent) => {
    // Pointer-based double-tap detection for platforms that use Pointer Events
    // (modern browsers replace touch events with pointer events). Mirror the
    // touch double-tap behaviour so quick taps on touch devices also trigger
    // zoom.
    try {
      if (e) {
        const pointerType = (e as any).pointerType;
        if (pointerType === 'touch') {
          // Only consider it a tap (and potential double-tap) when not panning
          // and the pointer didn't move beyond the tap threshold
          if (!isPanning && !movedRef.current) {
            // registerTap(e.clientX, e.clientY); // Removed to prevent duplicate with native touch
          }
        } else {
          // For mouse, register tap on pointer up if not panning and not moved
          if (!isPanning && !movedRef.current) {
            registerTap(e.clientX, e.clientY);
          }
        }
      }
    } catch (_) {
      // ignore
    }

    setIsPanning(false);
    panStartRef.current = null;
    pointerStartRef.current = null;
    movedRef.current = false;

    // Dispatch pan end event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monolog:pan_end'));
      } catch (_) {}
    }
  }, [isPanning, registerTap]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};