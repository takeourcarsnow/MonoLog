import { useCallback, useEffect, useRef, useState } from "react";

interface UseCarouselProps {
  imageUrls: string[];
  allowCarouselTouch?: boolean;
  pathname: string;
  onIndexChange?: (index: number) => void;
}

// Minimal, rAF-throttled carousel swipe handler to reduce jitter.
export function useCarousel({ imageUrls, allowCarouselTouch, pathname, onIndexChange }: UseCarouselProps) {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isZooming, setIsZooming] = useState(false);
  const isZoomingRef = useRef(false);

  // Gesture state
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const deltaX = useRef(0);
  const dragging = useRef(false);
  const locked = useRef(false); // locked to horizontal
  const rafRef = useRef<number | null>(null);

  useEffect(() => { if (index >= imageUrls.length) setIndex(Math.max(0, imageUrls.length - 1)); }, [imageUrls.length, index]);
  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { onIndexChange?.(index); }, [index, onIndexChange]);

  // set initial transform when index changes (or on mount)
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    // use a smooth transition for programmatic changes
    el.style.transition = 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)';
    el.style.transform = `translate3d(-${index * 100}%, 0, 0)`;
    // clean up transition after it finishes
    const t = setTimeout(() => { if (el) el.style.transition = ''; }, 300);
    return () => clearTimeout(t);
  }, [index]);

  const applyTransform = (x: number) => {
    const el = trackRef.current;
    if (!el) return;
    // translate relative to current index
    el.style.transform = `translate3d(calc(-${indexRef.current * 100}% + ${x}px), 0, 0)`;
  };

  const scheduleTransform = (x: number) => {
    deltaX.current = x;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      applyTransform(deltaX.current);
    });
  };

  const startDrag = (x: number, y: number, multi = false) => {
    if (isZoomingRef.current || multi) return;
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_start')); } catch (_) {}
    startX.current = x;
    startY.current = y;
    deltaX.current = 0;
    dragging.current = true;
    locked.current = false;
    // hint to the browser
    const el = trackRef.current;
    if (el) el.style.willChange = 'transform';
    try { document.body.style.userSelect = 'none'; document.body.style.cursor = 'grabbing'; } catch (_) {}
  };

  const moveDrag = (x: number, y?: number) => {
    if (!dragging.current || startX.current == null || isZoomingRef.current) return;
    const dx = x - startX.current;
    const dy = (typeof y === 'number' && startY.current != null) ? y - startY.current : 0;
    if (!locked.current) {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const lockThreshold = 8;
      if (absX > absY && absX > lockThreshold) locked.current = true;
      else if (absY > absX && absY > lockThreshold) {
        // vertical gesture: cancel carousel drag so browser handles scroll
        dragging.current = false;
        startX.current = null;
        locked.current = false;
        try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) {}
        return;
      }
    }
    if (locked.current) {
      // prevent page scroll when locked to horizontal from touch handlers
      scheduleTransform(dx);
    }
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    locked.current = false;
    // determine target based on delta and container width
    const dx = deltaX.current || 0;
    const el = trackRef.current;
    const containerWidth = el ? el.getBoundingClientRect().width : 0;
    const ratio = containerWidth ? Math.abs(dx) / containerWidth : 0;
    const pxThreshold = 40;
    const ratioThreshold = 0.18; // swipe fraction
    let target = indexRef.current;
    if ((Math.abs(dx) > pxThreshold) && (ratio > ratioThreshold || Math.abs(dx) > containerWidth * 0.35)) {
      if (dx > 0) target = Math.max(0, indexRef.current - 1);
      else target = Math.min(imageUrls.length - 1, indexRef.current + 1);
    }
    // snap to target with transition
    if (el) {
      el.style.transition = 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.transform = `translate3d(-${target * 100}%, 0, 0)`;
      // cleanup transition after animation
      setTimeout(() => { if (el) el.style.transition = ''; if (el) el.style.willChange = ''; }, 300);
    }
    deltaX.current = 0;
    startX.current = null;
    try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) {}
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_end')); } catch (_) {}
    setIndex(target);
  };

  // Pointer / touch / mouse handlers (kept minimal)
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      // multi-touch -> let zoom handlers take over
      startDrag(0, 0, true);
      setIsZooming(true);
      isZoomingRef.current = true;
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_start')); } catch (_) {}
      return;
    }
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY, false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) return; // ignore
    const t = e.touches[0];
    moveDrag(t.clientX, t.clientY);
    if (locked.current) {
      try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
    }
  };

  const onTouchEnd = () => {
    if (isZoomingRef.current) {
      // end zooming state
      setIsZooming(false);
      isZoomingRef.current = false;
      // reset transform to current index
      const el = trackRef.current;
      if (el) el.style.transform = `translate3d(-${indexRef.current * 100}%, 0, 0)`;
      return;
    }
    endDrag();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // ignore non-primary button
    if ((e as any).button && (e as any).button !== 0) return;
    // pointerType touch handled here too
    startDrag(e.clientX, e.clientY, false);
    const el = trackRef.current as any;
    try { if (el && el.setPointerCapture) el.setPointerCapture(e.pointerId); } catch (_) {}
  };

  const onPointerMove = (e: React.PointerEvent) => {
    moveDrag(e.clientX, e.clientY);
    if (locked.current) {
      try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const el = trackRef.current as any;
    try { if (el && el.releasePointerCapture) el.releasePointerCapture(e.pointerId); } catch (_) {}
    endDrag();
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    startDrag(e.clientX, e.clientY, false);
    // attach doc move/up to support dragging outside element
    const move = (ev: MouseEvent) => moveDrag(ev.clientX, ev.clientY);
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); endDrag(); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  useEffect(() => {
    // cleanup rAF on unmount
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, []);

  useEffect(() => {
    function onZoomStart() { endDrag(); setIsZooming(true); isZoomingRef.current = true; }
    function onZoomEnd() { setIsZooming(false); isZoomingRef.current = false; const el = trackRef.current; if (el) el.style.transform = `translate3d(-${indexRef.current * 100}%,0,0)`; }
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
  }, []);

  const pointerSupported = typeof window !== 'undefined' && (window as any).PointerEvent !== undefined;

  const carouselTouchProps = (pathname?.startsWith('/post/') && !allowCarouselTouch) ? {} : (
    pointerSupported
      ? { onPointerDown, onPointerMove, onPointerUp }
      : { onTouchStart, onTouchMove, onTouchEnd, onMouseDown }
  );

  return {
    index,
    setIndex,
    trackRef,
    prev: () => setIndex(i => (i <= 0 ? 0 : i - 1)),
    next: () => setIndex(i => (i >= imageUrls.length - 1 ? imageUrls.length - 1 : i + 1)),
    carouselTouchProps,
  };
}
