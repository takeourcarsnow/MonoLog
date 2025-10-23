import { useCallback, useEffect } from 'react';
import { getBounds } from '../utils/zoomUtils';

interface UseTouchEventsParams {
  scale: number;
  scaleRef: React.MutableRefObject<number>;
  txRef: React.MutableRefObject<number>;
  tyRef: React.MutableRefObject<number>;
  setIsPanning: (panning: boolean) => void;
  setIsTransitioning: (transitioning: boolean) => void;
  panStartRef: React.MutableRefObject<{ x: number; y: number; tx: number; ty: number } | null>;
  touchStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  movedRef: React.MutableRefObject<boolean>;
  pinchRef: React.MutableRefObject<
    | null
    | {
        initialDistance: number;
        initialScale: number;
        // midpoint inside the container at gesture start
        midLocalX: number;
        midLocalY: number;
        // tx/ty at gesture start (so we can compute scale-ratio-preserving translation)
        startTx: number;
        startTy: number;
      }
  >;
  wheelEnabledRef: React.MutableRefObject<boolean>;
  containerRef: React.RefObject<HTMLDivElement>;
  imgRef: React.RefObject<HTMLImageElement>;
  naturalRef: React.MutableRefObject<{ w: number; h: number }>;
  containerRectRef: React.MutableRefObject<{ width: number; height: number } | null>;
  maxScale: number;
  setScale: (scale: number) => void;
  setTx: (tx: number) => void;
  setTy: (ty: number) => void;
  TAP_MOVE_THRESHOLD: number;
  isPanning: boolean;
  isFullscreen: boolean;
  lastTapTimeoutRef: React.MutableRefObject<number | null>;
  registerTap: (clientX: number, clientY: number) => void;
}

export const useTouchEvents = ({
  scale,
  scaleRef,
  txRef,
  tyRef,
  setIsPanning,
  setIsTransitioning,
  panStartRef,
  touchStartRef,
  movedRef,
  pinchRef,
  wheelEnabledRef,
  containerRef,
  imgRef,
  naturalRef,
  containerRectRef,
  maxScale,
  setScale,
  setTx,
  setTy,
  TAP_MOVE_THRESHOLD,
  isPanning,
  isFullscreen,
  lastTapTimeoutRef,
  registerTap,
}: UseTouchEventsParams) => {
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // If two fingers, start a pinch gesture
    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const dist = Math.hypot(dx, dy) || 1;
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const midLocalX = midX - rect.left;
      const midLocalY = midY - rect.top;
      // Store the translation at pinch start so we can preserve the point
      // under the fingers when scale changes by applying a scale-ratio
      // transformation.
      pinchRef.current = {
        initialDistance: dist,
        initialScale: scaleRef.current,
        midLocalX,
        midLocalY,
        startTx: txRef.current,
        startTy: tyRef.current,
      };
      // Make sure we aren't in pan mode
      setIsPanning(false);
      panStartRef.current = null;
      // Enable smooth transitions for pinch gestures
      setIsTransitioning(true);
      // Dispatch zoom start if we're starting from unzoomed
      if (scaleRef.current <= 1) {
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_start')); } catch(_) {}
        // Pinch explicitly activated zoom — allow wheel zoom too
        wheelEnabledRef.current = true;
      }
      // Prevent parent components from receiving touch start when pinching
      e.stopPropagation();
      return;
    }

    // Single-finger pan start only when already zoomed in
    if (scaleRef.current <= 1) return;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      // record touch start to distinguish tap vs drag
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      movedRef.current = false;

      // Disable transitions during panning for instant response
      setIsTransitioning(false);
      setIsPanning(true);
      panStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        tx: txRef.current,
        ty: tyRef.current
      };
      // Dispatch pan start event
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('monolog:pan_start'));
      } catch (_) {}
      }
      // Prevent parent components from receiving touch start when starting to pan.
      // We do not call preventDefault here because native listeners (attached
      // with passive: false) handle calling preventDefault when necessary.
      e.stopPropagation();
    }
  }, [setIsPanning, setIsTransitioning]);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // If pinch in progress (two touches), handle pinch-to-zoom
    if (e.touches.length === 2 && pinchRef.current) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const dist = Math.hypot(dx, dy) || 1;
      const p = pinchRef.current;
      const ratio = dist / p.initialDistance;
      let newScale = Math.max(1, Math.min(maxScale, p.initialScale * ratio));

      // Preserve the point under the fingers by computing translation
      // relative to the pinch-start midpoint using scale ratio math.
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const containerWidth = rect.width;
        const containerHeight = rect.height;

        // Coordinates of pinch midpoint at start (midLocalX/midLocalY)
        // We want that same point to remain under fingers, so compute
        // newTx/newTy by scaling the delta from center and applying
        // the change relative to startTx/startTy.
        const scaleRatio = newScale / p.initialScale;
        const cx = containerWidth / 2;
        const cy = containerHeight / 2;

        // Vector from center to midpoint at start
        const dxMid = p.midLocalX - cx;
        const dyMid = p.midLocalY - cy;

        // New translation so that midpoint stays fixed
        const newTx = p.startTx * scaleRatio + dxMid * (1 - scaleRatio);
        const newTy = p.startTy * scaleRatio + dyMid * (1 - scaleRatio);

        // Clamp to bounds
        const bounds = getBounds(containerRef, imgRef, naturalRef, newScale, containerRectRef);
        const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
        const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

        setScale(newScale);
        setTx(clampedTx);
        setTy(clampedTy);
      }

      // Prevent parent components from receiving swipe gestures when pinching
      e.stopPropagation();
      return;
    }

    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    // mark moved if movement exceeds threshold
    if (touchStartRef.current) {
      const dxStart = touch.clientX - touchStartRef.current.x;
      const dyStart = touch.clientY - touchStartRef.current.y;
      if (!movedRef.current && Math.hypot(dxStart, dyStart) > TAP_MOVE_THRESHOLD) movedRef.current = true;
    }

    if (!isPanning || !panStartRef.current) return;

    const dx = touch.clientX - panStartRef.current.x;
    const dy = touch.clientY - panStartRef.current.y;

    const newTx = panStartRef.current.tx + dx;
    const newTy = panStartRef.current.ty + dy;

    const bounds = getBounds(containerRef, imgRef, naturalRef, scaleRef.current, containerRectRef);
    const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
    const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

    setTx(clampedTx);
    setTy(clampedTy);

    // Prevent parent components from receiving swipe gestures when panning
    e.stopPropagation();
  }, [maxScale, setScale, setTx, setTy, TAP_MOVE_THRESHOLD, isPanning]);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // If pinch was active and now fewer than 2 touches remain, end pinch
    const wasPinch = pinchRef.current !== null;
    if (pinchRef.current && e.touches.length < 2) {
      pinchRef.current = null;
      // Disable transitions after pinch ends
      setTimeout(() => setIsTransitioning(false), 300);
      // If we scaled back to 1, dispatch zoom end
      if (scaleRef.current <= 1) {
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_end')); } catch(_) {}
      }
      // fallthrough to clear panning/double-tap handlers when appropriate
    }

    setIsPanning(false);
    panStartRef.current = null;
    // Clear touch start/moved tracking and only register tap if movement small
    const t = (e.changedTouches && e.changedTouches[0]);
    if (t && !movedRef.current && !wasPinch) {
      // This will be a tap; register it
      registerTap(t.clientX, t.clientY);
    }
    touchStartRef.current = null;
    movedRef.current = false;

    // Dispatch pan end event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monolog:pan_end'));
      } catch (_) {}
    }
  }, [setIsPanning, setIsTransitioning, registerTap]);

  // Attach native touch listeners to allow preventDefault (passive: false)
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (ev: TouchEvent) => {
      try {
        // If we're showing the image fullscreen, block the browser's native
        // double-tap-to-zoom by preventing the default on touchstart. Some
        // older mobile browsers ignore touch-action so this guard ensures our
        // double-tap handler runs. Also prevent when two-finger gestures begin.
        if (isFullscreen || (ev.touches && ev.touches.length === 2)) ev.preventDefault();
      } catch (_) {}
      try { handleTouchStart((ev as unknown) as React.TouchEvent); } catch (_) {}
    };

    const onTouchMove = (ev: TouchEvent) => {
      try {
        // Prevent browser scrolling only when pinch/panning/zoom is active.
        // Do NOT prevent simply because we've detected movement (movedRef) —
        // that would block normal page scrolls when the image is unzoomed.
        if (pinchRef.current || isPanning || scaleRef.current > 1) ev.preventDefault();
      } catch (_) {}
      try { handleTouchMove((ev as unknown) as React.TouchEvent); } catch (_) {}
    };

    const onTouchEnd = (ev: TouchEvent) => {
      try { handleTouchEnd((ev as unknown) as React.TouchEvent); } catch (_) {}
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart as any);
      el.removeEventListener('touchmove', onTouchMove as any);
      el.removeEventListener('touchend', onTouchEnd as any);
      // Clear any pending tap timeout to avoid stale timers after unmount
      if (lastTapTimeoutRef.current) {
        clearTimeout(lastTapTimeoutRef.current as any);
        lastTapTimeoutRef.current = null;
      }
    };
  }, [containerRef, isFullscreen, isPanning]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};