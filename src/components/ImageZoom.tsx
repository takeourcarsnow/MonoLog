/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useRef, useState } from "react";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  maxScale?: number;
};

export function ImageZoom({ src, alt, className, style, maxScale = 4, ...rest }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const lastPan = useRef({ x: 0, y: 0 });
  const startPan = useRef({ x: 0, y: 0 });
  const pinchStartPan = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);
  const lastPinchAt = useRef<number | null>(null);
  const pinchAnchorsRef = useRef<Array<{ el: HTMLElement; prev: string }>>([]);
  const startScale = useRef(1);
  const scaleRef = useRef(1);
  const natural = useRef({ w: 0, h: 0 });
  const lastMoveTs = useRef<number | null>(null);
  const lastMovePos = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const flingRaf = useRef<number | null>(null);
  const isPinching = useRef(false);
  const wasPinched = useRef(false);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const txRef = useRef(0);
  const tyRef = useRef(0);

  const [isPinchingState, setIsPinchingState] = useState(false);

  type Updater = number | ((prev: number) => number);
  const setTxSafe = (v: Updater) => setTx((prev) => {
    const next = typeof v === 'function' ? (v as (p: number) => number)(prev) : v;
    txRef.current = next;
    return next;
  });
  const setTySafe = (v: Updater) => setTy((prev) => {
    const next = typeof v === 'function' ? (v as (p: number) => number)(prev) : v;
    tyRef.current = next;
    return next;
  });

  // Keep a ref copy of the latest scale so event handlers (which may have
  // stale closures) can make decisions using the freshest value.
  React.useEffect(() => { scaleRef.current = scale; }, [scale]);
  const [isPanning, setIsPanning] = useState(false);
  const [isTile, setIsTile] = useState(false);
  const doubleTapRef = useRef<number | null>(null);

  const clamp = (v: number, a = -Infinity, b = Infinity) => Math.max(a, Math.min(b, v));

  function getBoundsForScale(s = scale) {
    const c = containerRef.current;
    const img = imgRef.current;
    if (!c || !img) return { maxTx: 0, maxTy: 0, containerW: 0, containerH: 0 };
    const rect = c.getBoundingClientRect();
    const containerW = rect.width;
    const containerH = rect.height;
    const natW = img.naturalWidth || natural.current.w || containerW;
    const natH = img.naturalHeight || natural.current.h || containerH;
    // image is rendered at width = containerW, height scaled by natural aspect ratio
    const baseW = containerW;
    const baseH = baseW * (natH / Math.max(1, natW));
    const scaledW = baseW * s;
    const scaledH = baseH * s;
    const maxTx = Math.max(0, (scaledW - containerW) / 2);
    const maxTy = Math.max(0, (scaledH - containerH) / 2);
    return { maxTx, maxTy, containerW, containerH };
  }

  // Accept React.Touch or native Touch to satisfy React types in event handlers
  function getTouchDist(t0: any, t1: any) {
    const dx = t0.clientX - t1.clientX;
    const dy = t0.clientY - t1.clientY;
    return Math.hypot(dx, dy);
  }

  function getCentroid(t0: any, t1: any) {
    return {
      x: (t0.clientX + t1.clientX) / 2,
      y: (t0.clientY + t1.clientY) / 2,
    };
  }

  function toLocalPoint(clientX: number, clientY: number) {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: clientX - r.left - r.width / 2, y: clientY - r.top - r.height / 2 };
  }

  const reset = () => {
    startScale.current = 1;
    lastTouchDist.current = null;
    lastPan.current = { x: 0, y: 0 };
    setScale(1);
    setTxSafe(0);
    setTySafe(0);
    setIsPanning(false);
  };

  // Detect if this ImageZoom is rendered inside a grid tile so we can
  // use cover/fill styles (center & crop) to make images align nicely.
  React.useEffect(() => {
    try {
      const el = containerRef.current;
      if (!el) return;
      const tile = el.closest && (el.closest('.tile') as Element | null);
      setIsTile(!!tile);
    } catch (e) {
      // ignore
    }
  }, []);

  const handleDoubleTap = (clientX: number, clientY: number) => {
    // toggle between 1 and 2x (or maxScale if smaller)
    const target = scale > 1.1 ? 1 : Math.min(2, maxScale);
    if (target === 1) {
      reset();
      return;
    }
    // focus on tap point: compute offset so tapped point stays stable
    const local = toLocalPoint(clientX, clientY);
    const newScale = target;
    const dx = local.x * (1 - newScale / scale);
    const dy = local.y * (1 - newScale / scale);
    setScale(newScale);
    const b = getBoundsForScale(newScale);
    setTx(t => clamp(t + dx, -b.maxTx, b.maxTx));
    setTy(t => clamp(t + dy, -b.maxTy, b.maxTy));
    startScale.current = newScale;
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
      // stop any ongoing fling
      if (flingRaf.current) cancelAnimationFrame(flingRaf.current);
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
      const local = toLocalPoint(c.x, c.y);
      // compute translation relative to pan at pinch start to avoid cumulative drift
      const dx = local.x * (1 - next / startScale.current);
      const dy = local.y * (1 - next / startScale.current);
      // clamp to dynamic bounds
      const b = getBoundsForScale(next);
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
      setIsPanning(false);
        if (wasPinched.current) {
        // A pinch gesture just finished. Don't unconditionally reset the zoom
        // — keep the new scale and ensure translations are within bounds.
        wasPinched.current = false;
        // If the scale is effectively back to 1, reset state; otherwise
        // spring the translation back into valid bounds for the current scale.
        if (scaleRef.current <= 1.05) reset();
        else springBack();
      } else {
        const v = velocity.current;
        const speed = Math.hypot(v.x, v.y);
        if (speed > 400) {
          startFling(v.x, v.y);
        } else {
          // small release adjustments: if scale close to 1, reset
          if (scaleRef.current <= 1.05) reset();
          else springBack();
        }
      }
    }
    // Do not start single-finger panning after a pinch; we prefer a simple
    // pinch-to-zoom interaction without one-finger pan continuation.
    // double-tap detection
    if (e.changedTouches.length === 1) {
      const t = Date.now();
      if (doubleTapRef.current && t - doubleTapRef.current < 300) {
        handleDoubleTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        doubleTapRef.current = null;
      } else {
        doubleTapRef.current = t;
        setTimeout(() => { doubleTapRef.current = null; }, 350);
      }
    }
  };

  // Mouse / pointer pan support (when zoomed)
  const pointerActive = useRef(false);
  const onPointerDown: React.PointerEventHandler = (e) => {
    // Ignore touch pointer events here to avoid one-finger panning on touch
    // devices; only allow pointer-based panning for mouse/pen.
    if (scale <= 1) return;
    if ((e as any).pointerType === 'touch') return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
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
    const b = getBoundsForScale(scale);
    const nextTx = clamp(lastPan.current.x + dx, -b.maxTx - 100, b.maxTx + 100);
    const nextTy = clamp(lastPan.current.y + dy, -b.maxTy - 100, b.maxTy + 100);
  setTxSafe(nextTx);
  setTySafe(nextTy);

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
    try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch (_) {}
    pointerActive.current = false;
    setIsPanning(false);
    // check velocity and fling
    const v = velocity.current;
    const speed = Math.hypot(v.x, v.y);
    if (speed > 400) startFling(v.x, v.y);
    else {
      if (scaleRef.current <= 1.05) reset();
      else springBack();
    }
  };

  function springBack() {
    // animate tx/ty back within hard bounds
    const b = getBoundsForScale(scale);
    const targetTx = clamp(txRef.current, -b.maxTx, b.maxTx);
    const targetTy = clamp(tyRef.current, -b.maxTy, b.maxTy);
    const startTx = txRef.current;
    const startTy = tyRef.current;
    const dur = 300;
    const start = performance.now();
    if (flingRaf.current) cancelAnimationFrame(flingRaf.current);
    function step(now: number) {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      setTxSafe(startTx + (targetTx - startTx) * ease);
      setTySafe(startTy + (targetTy - startTy) * ease);
      if (t < 1) flingRaf.current = requestAnimationFrame(step);
      else flingRaf.current = null;
    }
    flingRaf.current = requestAnimationFrame(step);
  }

  function startFling(vx: number, vy: number) {
    if (flingRaf.current) cancelAnimationFrame(flingRaf.current);
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
      const b = getBoundsForScale(scale);
      // allow small overshoot
      const softX = b.maxTx + 100;
      const softY = b.maxTy + 100;
      const clampedTx = clamp(nextTx, -softX, softX);
      const clampedTy = clamp(nextTy, -softY, softY);
      setTxSafe(clampedTx);
      setTySafe(clampedTy);
      // apply decay
      currVx *= Math.pow(decay, dt * 60);
      currVy *= Math.pow(decay, dt * 60);
      // if hit hard bounds, dampen velocity
      if (clampedTx > b.maxTx || clampedTx < -b.maxTx) currVx *= 0.5;
      if (clampedTy > b.maxTy || clampedTy < -b.maxTy) currVy *= 0.5;
      // stop conditions
      if (Math.hypot(currVx, currVy) < 20) {
        flingRaf.current = null;
        // spring back into bounds if necessary
        springBack();
        return;
      }
      flingRaf.current = requestAnimationFrame(frame);
    }
    flingRaf.current = requestAnimationFrame(frame);
  }

  return (
    <div
      ref={containerRef}
      // block clicks that occur immediately after a pinch so parent Links
      // don't interpret the gesture as a tap/click which would navigate or
      // reset the carousel. We use a short time window to allow normal clicks.
      onClick={(e) => {
        const t = lastPinchAt.current;
        if (t && Date.now() - t < 700) {
          try { e.stopPropagation(); e.preventDefault(); } catch (_) {}
        }
      }}
      className={className}
      style={{
        overflow: "hidden",
        // When not pinching or zoomed, allow default pointer behavior so
        // parent carousels can receive mouse/pointer drags on desktop.
        touchAction: isPinchingState || scale > 1 ? "none" : "auto",
        // make the container fill the card width so images can center
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        ...style,
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img
        {...rest}
        ref={imgRef}
        src={src}
        alt={alt}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: isPanning ? "none" : "transform 120ms ease-out",
          display: "block",
          // When rendered inside a square grid tile, fill the tile and
          // crop (object-fit: cover) so images are centered consistently.
          // Otherwise render responsive width with preserved aspect ratio
          // and center the image within the card.
          width: isTile ? "100%" : "auto",
          maxWidth: isTile ? undefined : "100%",
          height: isTile ? "100%" : "auto",
          margin: isTile ? undefined : "0 auto",
          objectFit: isTile ? "cover" : "contain",
          objectPosition: "center center",
          userSelect: "none",
          // Mirror the container touchAction here. When not zoomed, let
          // pointer events behave normally so the carousel can handle
          // horizontal swipes with the mouse on desktop.
          touchAction: isPinchingState || scale > 1 ? "none" : "auto",
        }}
        draggable={false}
      />
    </div>
  );
}

export default ImageZoom;
