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
  const lastTouchDist = useRef<number | null>(null);
  const startScale = useRef(1);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const doubleTapRef = useRef<number | null>(null);

  const clamp = (v: number, a = -Infinity, b = Infinity) => Math.max(a, Math.min(b, v));

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
    setTx(0);
    setTy(0);
    setIsPanning(false);
  };

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
    setTx(t => clamp(t + dx, -9999, 9999));
    setTy(t => clamp(t + dy, -9999, 9999));
    startScale.current = newScale;
  };

  const onTouchStart: React.TouchEventHandler = (e) => {
    if (!containerRef.current) return;
    if (e.touches.length === 2) {
      // begin pinch
      e.preventDefault();
      lastTouchDist.current = getTouchDist(e.touches[0], e.touches[1]);
      startScale.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      // begin pan
      e.preventDefault();
      setIsPanning(true);
      lastPan.current = { x: tx, y: ty };
      startPan.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const onTouchMove: React.TouchEventHandler = (e) => {
    if (!containerRef.current) return;
    if (e.touches.length === 2 && lastTouchDist.current != null) {
      e.preventDefault();
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      const ratio = dist / lastTouchDist.current;
      let next = clamp(startScale.current * ratio, 1, maxScale);
      setScale(next);
      // attempt to keep midpoint stable
      const c = getCentroid(e.touches[0], e.touches[1]);
      const local = toLocalPoint(c.x, c.y);
      const dx = local.x * (1 - next / startScale.current);
      const dy = local.y * (1 - next / startScale.current);
      setTx(t => clamp(t + dx, -9999, 9999));
      setTy(t => clamp(t + dy, -9999, 9999));
    } else if (e.touches.length === 1 && isPanning) {
      e.preventDefault();
      const cur = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const dx = cur.x - startPan.current.x;
      const dy = cur.y - startPan.current.y;
      setTx(clamp(lastPan.current.x + dx, -9999, 9999));
      setTy(clamp(lastPan.current.y + dy, -9999, 9999));
    }
  };

  const onTouchEnd: React.TouchEventHandler = (e) => {
    if (!containerRef.current) return;
    if (e.touches.length < 2) lastTouchDist.current = null;
    if (e.touches.length === 0) {
      setIsPanning(false);
      // small release adjustments: if scale close to 1, reset
      if (scale <= 1.05) reset();
    }
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
    if (scale <= 1) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointerActive.current = true;
    setIsPanning(true);
    lastPan.current = { x: tx, y: ty };
    startPan.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove: React.PointerEventHandler = (e) => {
    if (!pointerActive.current) return;
    e.preventDefault();
    const cur = { x: e.clientX, y: e.clientY };
    const dx = cur.x - startPan.current.x;
    const dy = cur.y - startPan.current.y;
    setTx(clamp(lastPan.current.x + dx, -9999, 9999));
    setTy(clamp(lastPan.current.y + dy, -9999, 9999));
  };

  const onPointerUp: React.PointerEventHandler = (e) => {
    try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch (_) {}
    pointerActive.current = false;
    setIsPanning(false);
    if (scale <= 1.05) reset();
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        overflow: "hidden",
        touchAction: "none",
        display: "inline-block",
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
          width: "100%",
          height: "auto",
          userSelect: "none",
          touchAction: "none",
        }}
        draggable={false}
      />
    </div>
  );
}

export default ImageZoom;
