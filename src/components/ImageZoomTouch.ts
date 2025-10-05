"use client";

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
  lastTouchDist: React.MutableRefObject<number | null>,
  lastPinchAt: React.MutableRefObject<number | null>,
  isPinching: React.MutableRefObject<boolean>,
  wasPinched: React.MutableRefObject<boolean>,
  setIsPinchingState: (pinching: boolean) => void,
  pinchAnchorsRef: React.MutableRefObject<Array<{ el: HTMLElement; prev: string }>>,
  startScale: React.MutableRefObject<number>,
  pinchStartPan: React.MutableRefObject<{ x: number; y: number }>,
  imgRef: React.RefObject<HTMLImageElement>,
  natural: React.MutableRefObject<{ w: number; h: number }>
) {
  const reset = () => {
    startScale.current = 1;
    lastTouchDist.current = null;
    setScale(1);
    setTxSafe(0);
    setTySafe(0);
  };

  const onTouchStart: React.TouchEventHandler = (e) => {
    if (!containerRef.current) return;
    if (e.touches.length === 2) {
      // begin pinch
      // prevent default behaviour and stop propagation so parent carousels / links
      // don't begin their own touch handling (which can cause the carousel to
      // jump or trigger navigation).
      e.preventDefault();
      try { e.stopPropagation(); } catch (_) { /* ignore */ }
      lastPinchAt.current = Date.now();
      isPinching.current = true;
      wasPinched.current = true;
      setIsPinchingState(true);
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_start')); } catch (_) {}
      lastTouchDist.current = getTouchDist(e.touches[0], e.touches[1]);
      // disable pointer events on relevant ancestor elements (link, carousel)
      try {
        // Only disable pointer-events on the immediate clickable anchor(s)
        // around the image (the <a> / .media-link). Disabling the
        // carousel wrapper/track can interfere with layout/transform state
        // and cause the carousel to jump (observed when pinching non-first
        // slides). Keep this minimal to prevent navigation while pinching.
        const found: Array<HTMLElement> = [];
        const anchor = containerRef.current.closest('a') as HTMLElement | null;
        if (anchor) found.push(anchor);
        const mediaLink = containerRef.current.closest('.media-link') as HTMLElement | null;
        if (mediaLink && mediaLink !== anchor) found.push(mediaLink);
        pinchAnchorsRef.current = found.map(el => ({ el, prev: el.style.pointerEvents || '' }));
        for (const a of pinchAnchorsRef.current) {
          a.el.style.pointerEvents = 'none';
        }
      } catch (_) { /* ignore */ }
      startScale.current = scale;
      // record pan at the moment pinch starts so we can anchor translations
      pinchStartPan.current = { x: tx, y: ty };
    }
  };

  const onTouchMove: React.TouchEventHandler = (e) => {
    if (!containerRef.current) return;
    if (e.touches.length === 2 && lastTouchDist.current != null) {
      // keep this gesture private to the image zoom
      e.preventDefault();
      try { e.stopPropagation(); } catch (_) { /* ignore */ }
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      const ratio = dist / lastTouchDist.current;
      let next = clamp(startScale.current * ratio, 1, maxScale);
      setScale(next);
      // attempt to keep midpoint stable
      const c = getCentroid(e.touches[0], e.touches[1]);
      const local = toLocalPoint(c.x, c.y, containerRef);
      // compute translation relative to pan at pinch start to avoid cumulative drift
      const dx = local.x * (1 - next / startScale.current);
      const dy = local.y * (1 - next / startScale.current);
      // clamp to dynamic bounds
      const b = getBoundsForScale(next, containerRef, imgRef, natural);
      setTxSafe(() => clamp(pinchStartPan.current.x + dx, -b.maxTx, b.maxTx));
      setTySafe(() => clamp(pinchStartPan.current.y + dy, -b.maxTy, b.maxTy));
    }
  };

  const onTouchEnd: React.TouchEventHandler = (e) => {
    if (!containerRef.current) return;
    if (e.touches.length < 2) lastTouchDist.current = null;
    // If a pinch was active and the touch count dropped below 2 (either
    // to 1 or 0), stop the pinch entirely and reset back to the non-zoomed
    // position per user preference.
    if (wasPinched.current && e.touches.length < 2) {
      // mark the time of the pinch so we can suppress click/navigation that
      // sometimes follows touchend on some browsers/devices
      lastPinchAt.current = Date.now();
      wasPinched.current = false;
      isPinching.current = false;
      setIsPinchingState(false);
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_end')); } catch (_) {}
      // restore any modified ancestor pointer-events
      try {
        for (const a of pinchAnchorsRef.current) {
          a.el.style.pointerEvents = a.prev || '';
        }
        pinchAnchorsRef.current = [];
      } catch (_) {}
      // Reset will clear scale and translations and end any pan state.
      reset();
      return;
    }
    // If all fingers removed, stop panning and possibly reset if nearly 1
    if (e.touches.length === 0) {
      if (isPinching.current) {
        isPinching.current = false;
        setIsPinchingState(false);
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_end')); } catch (_) {}
      }
      // ensure ancestor pointer-events restored in case of other paths
      try {
        for (const a of pinchAnchorsRef.current) {
          a.el.style.pointerEvents = a.prev || '';
        }
        pinchAnchorsRef.current = [];
      } catch (_) {}
      // perform fling if velocity present, but only if not resetting
      if (wasPinched.current) {
        // A pinch gesture just finished. Don't unconditionally reset the zoom
        // — keep the new scale and ensure translations are within bounds.
        wasPinched.current = false;
      }
    }
  };

  return { onTouchStart, onTouchMove, onTouchEnd, reset };
}