import React, { useCallback, useEffect } from 'react';
import { getBounds } from '../utils/zoomUtils';

interface ZoomState {
  containerRef: React.RefObject<HTMLDivElement>;
  imgRef: React.RefObject<HTMLImageElement>;
  scale: number;
  setScale: (scale: number) => void;
  tx: number;
  setTx: (tx: number) => void;
  ty: number;
  setTy: (ty: number) => void;
  isTile: boolean;
  setIsTile: (tile: boolean) => void;
  isPanning: boolean;
  setIsPanning: (panning: boolean) => void;
  lastDoubleTapRef: React.MutableRefObject<number | null>;
  lastTapTimeoutRef: React.MutableRefObject<number | null>;
  lastEventTimeRef: React.MutableRefObject<number | null>;
  panStartRef: React.MutableRefObject<{ x: number; y: number; tx: number; ty: number } | null>;
  naturalRef: React.MutableRefObject<{ w: number; h: number }>;
  touchStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  pointerStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  movedRef: React.MutableRefObject<boolean>;
  TAP_MOVE_THRESHOLD: number;
  scaleRef: React.MutableRefObject<number>;
  txRef: React.MutableRefObject<number>;
  tyRef: React.MutableRefObject<number>;
  pinchRef: React.MutableRefObject<null | { initialDistance: number; initialScale: number }>;
  wheelEnabledRef: React.MutableRefObject<boolean>;
  instanceIdRef: React.MutableRefObject<string>;
  maxScale: number;
  isFullscreen: boolean;
  isActive: boolean;
  src: string | undefined;
}

export const useZoomEvents = (state: ZoomState) => {
  const {
    containerRef,
    imgRef,
    scale,
    setScale,
    tx,
    setTx,
    ty,
    setTy,
    isTile,
    setIsTile,
    isPanning,
    setIsPanning,
    lastDoubleTapRef,
    lastTapTimeoutRef,
    lastEventTimeRef,
    panStartRef,
    naturalRef,
    touchStartRef,
    pointerStartRef,
    movedRef,
    TAP_MOVE_THRESHOLD,
    scaleRef,
    txRef,
    tyRef,
    pinchRef,
    wheelEnabledRef,
    instanceIdRef,
    maxScale,
    isFullscreen,
    isActive,
    src,
  } = state;

  // keep refs in sync with state
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { txRef.current = tx; }, [tx]);
  useEffect(() => { tyRef.current = ty; }, [ty]);

  // When another ImageZoom instance starts zooming, reset this one if it's
  // currently zoomed in. The originating instance will include its id in
  // the event detail; ignore events that originate from this instance.
  useEffect(() => {
    const onOtherZoom = (ev: Event) => {
      try {
        const e = ev as CustomEvent;
        const originId = e?.detail?.id as string | undefined;
        // If originId exists and it's from this instance, ignore. Otherwise
        // treat it as a request to close/reset this zoom instance.
        if (originId && originId === instanceIdRef.current) return; // ignore our own
        if (scaleRef.current > 1) {
          setScale(1);
          setTx(0);
          setTy(0);
          wheelEnabledRef.current = false;
          try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_end', { detail: { id: instanceIdRef.current } })); } catch(_) {}
        }
      } catch (_) {
        // ignore
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:zoom_start', onOtherZoom as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('monolog:zoom_start', onOtherZoom as any);
      }
    };
  }, [setScale, setTx, setTy, scaleRef, wheelEnabledRef, instanceIdRef]);

  // Detect if this ImageZoom is rendered inside a grid tile
  useEffect(() => {
    try {
      const el = containerRef.current;
      if (!el) return;
      const tile = el.closest && (el.closest('.tile') as Element | null);
      setIsTile(!!tile);
    } catch (e) {
      // ignore
    }
  }, [containerRef, setIsTile]);

  // Reset zoom when the image becomes inactive
  useEffect(() => {
    if (!isActive) {
      setScale(1);
      setTx(0);
      setTy(0);
      // Dispatch zoom end event
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('monolog:zoom_end'));
        } catch (_) {}
      }
    }
  }, [isActive, setScale, setTx, setTy]);

  // Set natural dimensions when image loads
  useEffect(() => {
    const img = imgRef.current;
    if (img) {
      if (img.complete) {
        naturalRef.current.w = img.naturalWidth;
        naturalRef.current.h = img.naturalHeight;
      } else {
        const onLoad = () => {
          naturalRef.current.w = img.naturalWidth;
          naturalRef.current.h = img.naturalHeight;
        };
        img.addEventListener('load', onLoad);
        return () => img.removeEventListener('load', onLoad);
      }
    }
  }, [src]);

  // Reset zoom state when src changes
  useEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
    // Dispatch zoom end event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monolog:zoom_end', { detail: { id: instanceIdRef.current } }));
      } catch (_) {}
    }
  }, [src, setScale, setTx, setTy, instanceIdRef]);

  const handleDoubleTap = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Use the ref to ensure we always read the latest scale (avoid stale
    // closure values). This makes double-tap reliably toggle zoom out when
    // the image is currently zoomed in.
    if (scaleRef.current > 1) {
      // Zoom out to center
      setScale(1);
      setTx(0);
      setTy(0);
      wheelEnabledRef.current = false;
      // Dispatch zoom end event
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('monolog:zoom_end', { detail: { id: instanceIdRef.current } }));
        } catch (_) {}
      }
    } else {
      // Zoom in to double tap location - use smaller scale for fullscreen
      const zoomScale = isFullscreen ? 1.5 : maxScale;
      setScale(zoomScale);

      // Calculate translation to center the tap point
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      const newTx = -(localX - containerWidth / 2) * zoomScale;
      const newTy = -(localY - containerHeight / 2) * zoomScale;

      // Clamp to bounds
      const bounds = getBounds(containerRef, imgRef, naturalRef, zoomScale);
      const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
      const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

      setTx(clampedTx);
      setTy(clampedTy);
      // Allow wheel zoom now that the user explicitly triggered zoom
      wheelEnabledRef.current = true;

      // Dispatch zoom start event
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('monolog:zoom_start', { detail: { id: instanceIdRef.current } }));
        } catch (_) {}
      }
    }
  }, [containerRef, imgRef, naturalRef, setScale, setTx, setTy, wheelEnabledRef, instanceIdRef, isFullscreen, maxScale]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (scale <= 1) return;
    // record pointer start to distinguish tap vs drag
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;

    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx: tx,
      ty: ty
    };

    // Dispatch pan start event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monolog:pan_start'));
      } catch (_) {}
    }

    e.preventDefault();
  }, [scale, setIsPanning, tx, ty]);

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

    const bounds = getBounds(containerRef, imgRef, naturalRef, scale);
    const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
    const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

    setTx(clampedTx);
    setTy(clampedTy);

    // Prevent parent components from receiving swipe gestures when panning
    e.stopPropagation();
    e.preventDefault();
  }, [pointerStartRef, movedRef, TAP_MOVE_THRESHOLD, isPanning, panStartRef, containerRef, imgRef, naturalRef, scale, setTx, setTy]);

  const handlePointerUp = useCallback((e?: React.PointerEvent) => {
    // Pointer-based double-tap detection for platforms that use Pointer Events
    // (modern browsers replace touch events with pointer events). Mirror the
    // touch double-tap behaviour so quick taps on touch devices also trigger
    // zoom.
    try {
      if (e && (e as any).pointerType === 'touch') {
        // Only consider it a tap (and potential double-tap) when not panning
        // and the pointer didn't move beyond the tap threshold
        if (!isPanning && !movedRef.current) {
          registerTap(e.clientX, e.clientY);
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
  }, [isPanning, movedRef]);

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
      pinchRef.current = { initialDistance: dist, initialScale: scaleRef.current };
      // Make sure we aren't in pan mode
      setIsPanning(false);
      panStartRef.current = null;
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
  }, [containerRef, scaleRef, setIsPanning, panStartRef, wheelEnabledRef, touchStartRef, movedRef, txRef, tyRef]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // If pinch in progress (two touches), handle pinch-to-zoom
    if (e.touches.length === 2 && pinchRef.current) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const dist = Math.hypot(dx, dy) || 1;
      const { initialDistance, initialScale } = pinchRef.current;
      const ratio = dist / initialDistance;
      let newScale = Math.max(1, Math.min(maxScale, initialScale * ratio));

      // Calculate current midpoint
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const midLocalX = midX - rect.left;
        const midLocalY = midY - rect.top;
        const containerWidth = rect.width;
        const containerHeight = rect.height;

        // Center the zoom on the current midpoint
        const newTx = -(midLocalX - containerWidth / 2) * newScale;
        const newTy = -(midLocalY - containerHeight / 2) * newScale;

        // Clamp to bounds
        const bounds = getBounds(containerRef, imgRef, naturalRef, newScale);
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

    const bounds = getBounds(containerRef, imgRef, naturalRef, scaleRef.current);
    const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
    const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

    setTx(clampedTx);
    setTy(clampedTy);

    // Prevent parent components from receiving swipe gestures when panning
    e.stopPropagation();
  }, [pinchRef, maxScale, containerRef, imgRef, naturalRef, setScale, setTx, setTy, touchStartRef, movedRef, TAP_MOVE_THRESHOLD, isPanning, panStartRef, scaleRef]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // If pinch was active and now fewer than 2 touches remain, end pinch
    const wasPinch = pinchRef.current !== null;
    if (pinchRef.current && e.touches.length < 2) {
      pinchRef.current = null;
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
  }, [pinchRef, scaleRef, setIsPanning, movedRef]);

  // Unified tap/double-tap registration helper to avoid races between
  // pointer and native touch handlers. Uses a timeout ref so we can
  // reliably clear pending timers on unmount and prevent duplicate
  // double-tap invocations.
  const registerTap = useCallback((clientX: number, clientY: number) => {
    const now = Date.now();
    // Ignore duplicate events from different event systems (pointer + touch)
    // fired almost simultaneously for a single physical tap.
    if (lastEventTimeRef.current && now - lastEventTimeRef.current < 10) return;
    lastEventTimeRef.current = now;

    if (lastDoubleTapRef.current && now - lastDoubleTapRef.current < 300) {
      // Detected double-tap
      lastDoubleTapRef.current = null;
      if (lastTapTimeoutRef.current) {
        clearTimeout(lastTapTimeoutRef.current as any);
        lastTapTimeoutRef.current = null;
      }
      try {
        handleDoubleTap(clientX, clientY);
      } catch (_) {}
    } else {
      lastDoubleTapRef.current = now;
      if (lastTapTimeoutRef.current) {
        clearTimeout(lastTapTimeoutRef.current as any);
      }
      lastTapTimeoutRef.current = window.setTimeout(() => {
        if (lastDoubleTapRef.current === now) lastDoubleTapRef.current = null;
        lastTapTimeoutRef.current = null;
      }, 310) as any;
    }
  }, [lastEventTimeRef, lastDoubleTapRef, lastTapTimeoutRef, handleDoubleTap]);

  // Attach native touch listeners to allow preventDefault (passive: false)
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
  }, [containerRef, isFullscreen, pinchRef, isPanning, scaleRef, handleTouchStart, handleTouchMove, handleTouchEnd, lastTapTimeoutRef]);

  // Add wheel event listener with passive: false to prevent default scrolling
  useEffect(() => {
    const imgElement = imgRef.current;
    if (!imgElement) return;

    const handleWheelEvent = (e: WheelEvent) => {
      // Only allow wheel to initiate zoom if the image is already zoomed or
      // the user explicitly activated zoom (double-click or pinch). This
      // prevents accidental zoom when simply scrolling the page over images.
      if (!wheelEnabledRef.current && scaleRef.current <= 1) return;

      // Allow wheel zoom (in/out) — if zooming out to scale 1 we reset to center
      e.preventDefault();
      e.stopPropagation();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Determine zoom direction and amount
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out on scroll down, zoom in on scroll up
      const newScale = Math.max(1, Math.min(maxScale, scaleRef.current * zoomFactor));

      // If scale didn't change, don't do anything
      if (newScale === scaleRef.current) return;

      // Calculate the point under the mouse cursor
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate new translation to keep the mouse point fixed
      const scaleRatio = newScale / scaleRef.current;
      const newTx = mouseX - (mouseX - txRef.current) * scaleRatio;
      const newTy = mouseY - (mouseY - tyRef.current) * scaleRatio;

      // If zooming out to scale 1, reset to center
      if (newScale === 1) {
        setScale(1);
        setTx(0);
        setTy(0);
        wheelEnabledRef.current = false;
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('monolog:zoom_end'));
          } catch (_) {}
        }
      } else {
        // Clamp to bounds
        const bounds = getBounds(containerRef, imgRef, naturalRef, newScale);
        const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
        const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

        setScale(newScale);
        setTx(clampedTx);
        setTy(clampedTy);

        // Dispatch zoom events
        if (scale === 1 && newScale > 1) {
          if (typeof window !== 'undefined') {
            try {
              window.dispatchEvent(new CustomEvent('monolog:zoom_start'));
            } catch (_) {}
          }
        }
      }
    };

    imgElement.addEventListener('wheel', handleWheelEvent, { passive: false });

    return () => {
      imgElement.removeEventListener('wheel', handleWheelEvent);
    };
  }, [imgRef, wheelEnabledRef, scaleRef, maxScale, containerRef, imgRef, naturalRef, setScale, setTx, setTy, scale, txRef, tyRef]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    registerTap,
  };
};