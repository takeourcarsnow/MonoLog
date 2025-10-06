import { useCallback, useEffect, useRef, useState } from "react";

interface UseCarouselProps {
  imageUrls: string[];
  allowCarouselTouch?: boolean;
  pathname: string;
  onIndexChange?: (index: number) => void;
}

export function useCarousel({ imageUrls, allowCarouselTouch, pathname, onIndexChange }: UseCarouselProps) {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isZooming, setIsZooming] = useState(false);
  const isZoomingRef = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const touchDeltaY = useRef<number>(0);
  const draggingRef = useRef(false);
  // When true we have decided the gesture is horizontal and should be
  // handled by the carousel (we'll then preventDefault to lock scrolling).
  const gestureLockedRef = useRef(false);
  const activeTouchPointers = useRef<Set<number>>(new Set());
  const pointerSupported = typeof window !== 'undefined' && (window as any).PointerEvent !== undefined;
  const lastMouseDownAt = useRef<number | null>(null);

  useEffect(() => {
    if (index >= imageUrls.length) setIndex(Math.max(0, imageUrls.length - 1));
  }, [imageUrls.length, index]);

  useEffect(() => { indexRef.current = index; }, [index]);

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  useEffect(() => {
    if (!trackRef.current) return;
    trackRef.current.style.transform = `translateX(-${index * 100}%)`;
  }, [index]);

  const prev = () => setIndex(i => (i <= 0 ? 0 : i - 1));
  const next = () => setIndex(i => (i >= imageUrls.length - 1 ? imageUrls.length - 1 : i + 1));

  const onTouchStart = (e: React.TouchEvent) => {
    if (isZoomingRef.current) return;
    // Only stop propagation for single touch to allow carousel swipe.
    // For multi-touch (pinch), let it propagate to ImageZoom.
    if (e.touches.length === 1) {
      e.stopPropagation();
      try { e.nativeEvent?.stopImmediatePropagation?.(); } catch (_) {}
    }
    for (let i = 0; i < e.touches.length; i++) {
      activeTouchPointers.current.add(e.touches[i].identifier as any as number);
    }
    if (activeTouchPointers.current.size >= 2) {
      finishPointerDrag();
      setIsZooming(true);
      isZoomingRef.current = true;
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_start')); } catch (_) {}
      return;
    }
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_start')); } catch (_) {}
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    touchDeltaY.current = 0;
    gestureLockedRef.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isZoomingRef.current) return;
    // Determine gesture direction: if horizontal movement dominates we
    // lock the gesture to the carousel and preventDefault to stop the
    // browser from scrolling/pull-to-refresh. If vertical movement
    // dominates, allow the browser to handle it.
    try { e.nativeEvent?.stopImmediatePropagation?.(); } catch (_) {}
    if (touchStartX.current == null || touchStartY.current == null) return;
    const cx = e.touches[0].clientX;
    const cy = e.touches[0].clientY;
    touchDeltaX.current = cx - touchStartX.current;
    touchDeltaY.current = cy - touchStartY.current;

    if (!gestureLockedRef.current) {
      const absX = Math.abs(touchDeltaX.current);
      const absY = Math.abs(touchDeltaY.current);
      const lockThreshold = 8; // px before we decide
      if (absX > absY && absX > lockThreshold) {
        gestureLockedRef.current = true;
        // Now that we've locked to horizontal, stop propagation and
        // prevent default so we can control the swipe without the
        // browser stealing the gesture.
        try { e.preventDefault(); } catch (_) {}
        try { e.stopPropagation(); } catch (_) {}
      } else if (absY > absX && absY > lockThreshold) {
        // Vertical gesture: don't lock, let browser handle (e.g., pull-to-refresh)
        return;
      }
    } else {
      // already locked to horizontal
      try { e.preventDefault(); } catch (_) {}
      try { e.stopPropagation(); } catch (_) {}
    }

    if (trackRef.current) trackRef.current.style.transform = `translateX(calc(-${index * 100}% + ${touchDeltaX.current}px))`;
  };

  const onTouchEnd = () => {
    try { activeTouchPointers.current.clear(); } catch (_) {}
    if (touchStartX.current == null) return;
    const delta = touchDeltaX.current;
    const threshold = 40;
    let target = index;
    if (delta > threshold) target = Math.max(0, index - 1);
    else if (delta < -threshold) target = Math.min(imageUrls.length - 1, index + 1);
    setIndex(target);
    if (trackRef.current) trackRef.current.style.transform = `translateX(-${target * 100}%)`;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_end')); } catch (_) {}
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (isZoomingRef.current) return;
    // Only stop propagation for single touch to allow carousel swipe.
    // For multi-touch (pinch), let it propagate to ImageZoom.
    if ((e as any).pointerType === 'touch' && activeTouchPointers.current.size < 2) {
      e.stopPropagation();
      try { e.nativeEvent?.stopImmediatePropagation?.(); } catch (_) {}
    }
    if (e.button !== 0) return;
    if ((e as any).pointerType === 'touch') {
      try { activeTouchPointers.current.add((e as any).pointerId); } catch (_) {}
      if (activeTouchPointers.current.size >= 2) {
        finishPointerDrag();
        setIsZooming(true);
        isZoomingRef.current = true;
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_start')); } catch (_) {}
        return;
      }
    }
    const now = Date.now();
    if (lastMouseDownAt.current && now - lastMouseDownAt.current < 400 && (e as any).pointerType === 'mouse') {
      // likely double-click, don't start dragging
      lastMouseDownAt.current = now;
      return;
    }
    if ((e as any).pointerType === 'mouse') lastMouseDownAt.current = now;
  touchStartX.current = e.clientX;
  touchStartY.current = e.clientY;
    touchDeltaX.current = 0;
  touchDeltaY.current = 0;
    draggingRef.current = true;
  gestureLockedRef.current = false;
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_start')); } catch (_) {}
    try { document.body.style.userSelect = 'none'; document.body.style.cursor = 'grabbing'; } catch (_) {}
    const el = trackRef.current as any;
    try { if (el && el.setPointerCapture) el.setPointerCapture(e.pointerId); } catch (_) {}
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if ((e as any).pointerType === 'touch' && activeTouchPointers.current.size >= 2) return;
    if (!draggingRef.current || touchStartX.current == null) return;
    const px = e.clientX;
    const py = (e as any).clientY as number | undefined;
    touchDeltaX.current = px - touchStartX.current;
    if (typeof py === 'number' && touchStartY.current != null) touchDeltaY.current = py - touchStartY.current;

    // Decide whether to lock to horizontal gesture similar to touch
    if (!gestureLockedRef.current) {
      const absX = Math.abs(touchDeltaX.current);
      const absY = Math.abs(touchDeltaY.current);
      const lockThreshold = 8;
      if (absX > absY && absX > lockThreshold) {
        gestureLockedRef.current = true;
        // preventDefault for pointer types that allow it (mouse/pointer)
        try { if ((e as any).pointerType !== 'touch') e.preventDefault(); } catch (_) {}
        try { e.stopPropagation(); } catch (_) {}
      } else if (absY > absX && absY > lockThreshold) {
        // vertical gesture -> do not lock
        return;
      }
    } else {
      // locked to horizontal
      try { if ((e as any).pointerType !== 'touch') e.preventDefault(); } catch (_) {}
      try { e.stopPropagation(); } catch (_) {}
    }

    if (trackRef.current) trackRef.current.style.transform = `translateX(calc(-${index * 100}% + ${touchDeltaX.current}px))`;
  };

  const finishPointerDrag = useCallback((clientX?: number) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    gestureLockedRef.current = false;
    if (isZoomingRef.current) {
      try {
        if (trackRef.current) trackRef.current.style.transform = `translateX(-${index * 100}%)`;
      } catch (_) {}
      touchStartX.current = null;
      touchDeltaX.current = 0;
      touchStartY.current = null;
      touchDeltaY.current = 0;
      try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) {}
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_end')); } catch (_) {}
      return;
    }
    const delta = touchDeltaX.current;
    const threshold = 40;
    let target = index;
    if (delta > threshold) target = Math.max(0, index - 1);
    else if (delta < -threshold) target = Math.min(imageUrls.length - 1, index + 1);
    setIndex(target);
    if (trackRef.current) trackRef.current.style.transform = `translateX(-${target * 100}%)`;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) {}
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_end')); } catch (_) {}
  }, [index, setIndex, imageUrls.length, trackRef, touchStartX, touchDeltaX, isZoomingRef]);

  const onPointerUp = (e: React.PointerEvent) => {
    const el = trackRef.current as any;
    try { if (el && el.releasePointerCapture) el.releasePointerCapture(e.pointerId); } catch (_) {}
    if ((e as any).pointerType === 'touch') {
      try { activeTouchPointers.current.delete((e as any).pointerId); } catch (_) {}
    }
    finishPointerDrag();
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    const el = trackRef.current as any;
    try { if (el && el.releasePointerCapture) el.releasePointerCapture(e.pointerId); } catch (_) {}
    if ((e as any).pointerType === 'touch') {
      try { activeTouchPointers.current.delete((e as any).pointerId); } catch (_) {}
    }
    finishPointerDrag();
  };

  const handleDocMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current || touchStartX.current == null) return;
    e.preventDefault();
    touchDeltaX.current = e.clientX - touchStartX.current;
    if (trackRef.current) trackRef.current.style.transform = `translateX(calc(-${index * 100}% + ${touchDeltaX.current}px))`;
  }, [index, touchStartX, touchDeltaX, trackRef]);

  const handleDocMouseUp = useCallback((e: MouseEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (isZoomingRef.current) {
      try {
        if (trackRef.current) trackRef.current.style.transform = `translateX(-${index * 100}%)`;
      } catch (_) {}
      touchStartX.current = null;
      touchDeltaX.current = 0;
      try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) {}
      document.removeEventListener('mousemove', handleDocMouseMove);
      document.removeEventListener('mouseup', handleDocMouseUp);
      return;
    }
    const delta = touchDeltaX.current;
    const threshold = 40;
    let target = index;
    if (delta > threshold) target = Math.max(0, index - 1);
    else if (delta < -threshold) target = Math.min(imageUrls.length - 1, index + 1);
    setIndex(target);
    if (trackRef.current) trackRef.current.style.transform = `translateX(-${target * 100}%)`;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) {}
    document.removeEventListener('mousemove', handleDocMouseMove);
    document.removeEventListener('mouseup', handleDocMouseUp);
  }, [index, setIndex, imageUrls.length, trackRef, touchStartX, touchDeltaX, isZoomingRef, handleDocMouseMove]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (isZoomingRef.current) return;
    e.stopPropagation();
    try { e.nativeEvent?.stopImmediatePropagation?.(); } catch (_) {}
    if (e.button !== 0) return;
    const now = Date.now();
    if (lastMouseDownAt.current && now - lastMouseDownAt.current < 400) {
      // likely double-click, don't start dragging
      lastMouseDownAt.current = now;
      return;
    }
    lastMouseDownAt.current = now;
    touchStartX.current = e.clientX;
    touchDeltaX.current = 0;
    draggingRef.current = true;
    try { document.body.style.userSelect = 'none'; document.body.style.cursor = 'grabbing'; } catch (_) {}
    document.addEventListener('mousemove', handleDocMouseMove);
    document.addEventListener('mouseup', handleDocMouseUp);
  };

  useEffect(() => {
    return () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) {}
        document.removeEventListener('mousemove', handleDocMouseMove);
        document.removeEventListener('mouseup', handleDocMouseUp);
      }
    };
  }, [index, handleDocMouseMove, handleDocMouseUp]);

  useEffect(() => {
    function onZoomStart() {
      finishPointerDrag();
      setIsZooming(true);
      isZoomingRef.current = true;
    }
    function onZoomEnd() {
      setIsZooming(false);
      isZoomingRef.current = false;
      try {
        if (trackRef.current) trackRef.current.style.transform = `translateX(-${indexRef.current * 100}%)`;
      } catch (_) {}
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:zoom_start', onZoomStart as EventListener);
      window.addEventListener('monolog:zoom_end', onZoomEnd as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('monolog:zoom_start', onZoomStart as EventListener);
        window.removeEventListener('monolog:zoom_end', onZoomEnd as EventListener);
      }
    };
  }, [finishPointerDrag]);

  const carouselTouchProps = (pathname?.startsWith('/post/') && !allowCarouselTouch) ? {} : (
    pointerSupported
      ? { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
      : { onTouchStart, onTouchMove, onTouchEnd, onMouseDown }
  );

  return {
    index,
    setIndex,
    trackRef,
    prev,
    next,
    carouselTouchProps,
  };
}
