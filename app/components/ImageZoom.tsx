/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  maxScale?: number;
  isActive?: boolean;
  isFullscreen?: boolean;
};

export function ImageZoom({ src, alt, className, style, maxScale = 2, isActive = true, isFullscreen = false, ...rest }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [isTile, setIsTile] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const lastDoubleTapRef = useRef<number | null>(null);
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const naturalRef = useRef({ w: 0, h: 0 });
  // Refs to mirror state for use in passive event handlers
  const scaleRef = useRef<number>(scale);
  const txRef = useRef<number>(tx);
  const tyRef = useRef<number>(ty);
  const pinchRef = useRef<null | { initialDistance: number; initialScale: number; midX: number; midY: number }>(null);
  // Whether wheel-driven zoom is allowed. It becomes true when the user
  // explicitly starts a zoom (double-click or pinch). This prevents the
  // mouse wheel from initiating zoom on accidental scrolls.
  const wheelEnabledRef = useRef<boolean>(false);

  // Detect if this ImageZoom is rendered inside a grid tile
  
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
  }, []);

  // Reset zoom state when src changes
  useEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
    // Dispatch zoom end event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monolog:zoom_end'));
      } catch (_) {}
    }
  }, [src]);

  // keep refs in sync with state
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { txRef.current = tx; }, [tx]);
  useEffect(() => { tyRef.current = ty; }, [ty]);

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
  }, [isActive]);

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

  const getBounds = useCallback((currentScale: number) => {
    const c = containerRef.current;
    const img = imgRef.current;
    if (!c || !img) return { maxTx: 0, maxTy: 0 };

    const rect = c.getBoundingClientRect();
    const containerW = rect.width;
    const containerH = rect.height;
    const natW = img.naturalWidth || naturalRef.current.w || containerW;
    const natH = img.naturalHeight || naturalRef.current.h || containerH;

    // Calculate the scale factor to fit the image within the container
    const fitScale = Math.min(containerW / natW, containerH / natH);
    const renderedW = natW * fitScale;
    const renderedH = natH * fitScale;

    // When zoomed with transform: scale(scale), the effective size
    const scaledW = renderedW * currentScale;
    const scaledH = renderedH * currentScale;

    const maxTx = Math.max(0, (scaledW - containerW) / 2);
    const maxTy = Math.max(0, (scaledH - containerH) / 2);

    return { maxTx, maxTy };
  }, []);

  const handleDoubleTap = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (scale > 1) {
      // Zoom out to center
      setScale(1);
      setTx(0);
      setTy(0);
      wheelEnabledRef.current = false;
      // Dispatch zoom end event
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('monolog:zoom_end'));
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

      const newTx = -(localX * zoomScale - containerWidth / 2);
      const newTy = -(localY * zoomScale - containerHeight / 2);

      // Clamp to bounds
      const bounds = getBounds(zoomScale);
      const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
      const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

      setTx(clampedTx);
      setTy(clampedTy);
      // Allow wheel zoom now that the user explicitly triggered zoom
      wheelEnabledRef.current = true;

      // Dispatch zoom start event
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('monolog:zoom_start'));
        } catch (_) {}
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;

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
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning || !panStartRef.current) return;

    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;

    const newTx = panStartRef.current.tx + dx;
    const newTy = panStartRef.current.ty + dy;

  const bounds = getBounds(scale);
    const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
    const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

    setTx(clampedTx);
    setTy(clampedTy);

    // Prevent parent components from receiving swipe gestures when panning
    e.stopPropagation();
    e.preventDefault();
  };

  const handlePointerUp = (e?: React.PointerEvent) => {
    // Pointer-based double-tap detection for platforms that use Pointer Events
    // (modern browsers replace touch events with pointer events). Mirror the
    // touch double-tap behaviour so quick taps on touch devices also trigger
    // zoom.
    try {
      if (e && (e as any).pointerType === 'touch') {
        const now = Date.now();
        // Only consider it a tap (and potential double-tap) when not panning
        if (!isPanning) {
          if (lastDoubleTapRef.current && now - lastDoubleTapRef.current < 300) {
            lastDoubleTapRef.current = null;
            handleDoubleTap(e.clientX, e.clientY);
          } else {
            lastDoubleTapRef.current = now;
            setTimeout(() => {
              if (lastDoubleTapRef.current === now) lastDoubleTapRef.current = null;
            }, 310);
          }
        }
      }
    } catch (_) {
      // ignore
    }

    setIsPanning(false);
    panStartRef.current = null;

    // Dispatch pan end event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monolog:pan_end'));
      } catch (_) {}
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // If two fingers, start a pinch gesture
    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const dist = Math.hypot(dx, dy) || 1;
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      pinchRef.current = { initialDistance: dist, initialScale: scaleRef.current, midX, midY };
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
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // If pinch in progress (two touches), handle pinch-to-zoom
    if (e.touches.length === 2 && pinchRef.current) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const dist = Math.hypot(dx, dy) || 1;
      const { initialDistance, initialScale, midX, midY } = pinchRef.current;
      const ratio = dist / initialDistance;
      let newScale = Math.max(1, Math.min(maxScale, initialScale * ratio));

      // Compute new translation so the midpoint stays anchored
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const midLocalX = midX - rect.left;
      const midLocalY = midY - rect.top;

      const scaleRatio = newScale / scaleRef.current;
      const newTx = midLocalX - (midLocalX - txRef.current) * scaleRatio;
      const newTy = midLocalY - (midLocalY - tyRef.current) * scaleRatio;

      const bounds = getBounds(newScale);
      const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
      const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

      setScale(newScale);
      setTx(clampedTx);
      setTy(clampedTy);

      // Prevent parent components from receiving swipe gestures when pinching
      e.stopPropagation();
      return;
    }

    if (!isPanning || !panStartRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - panStartRef.current.x;
    const dy = touch.clientY - panStartRef.current.y;

    const newTx = panStartRef.current.tx + dx;
    const newTy = panStartRef.current.ty + dy;

    const bounds = getBounds(scaleRef.current);
    const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
    const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

    setTx(clampedTx);
    setTy(clampedTy);

    // Prevent parent components from receiving swipe gestures when panning
    e.stopPropagation();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // If pinch was active and now fewer than 2 touches remain, end pinch
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

    // Dispatch pan end event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monolog:pan_end'));
      } catch (_) {}
    }
  };

  // Attach native touch listeners to allow preventDefault (passive: false)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (ev: TouchEvent) => {
      try {
        if (ev.touches && ev.touches.length === 2) ev.preventDefault();
      } catch (_) {}
      try { handleTouchStart((ev as unknown) as React.TouchEvent); } catch (_) {}
    };

    const onTouchMove = (ev: TouchEvent) => {
      try {
        if (pinchRef.current || isPanning || scaleRef.current > 1) ev.preventDefault();
      } catch (_) {}
      try { handleTouchMove((ev as unknown) as React.TouchEvent); } catch (_) {}
    };

    const onTouchEnd = (ev: TouchEvent) => {
      try {
        const now = Date.now();
        if (!isPanning) {
          if (lastDoubleTapRef.current && now - lastDoubleTapRef.current < 300) {
            lastDoubleTapRef.current = null;
            const t = ev.changedTouches && ev.changedTouches[0];
            if (t) handleDoubleTap(t.clientX, t.clientY);
          } else {
            lastDoubleTapRef.current = now;
            setTimeout(() => {
              if (lastDoubleTapRef.current === now) lastDoubleTapRef.current = null;
            }, 310);
          }
        }
      } catch (_) {}
      try { handleTouchEnd((ev as unknown) as React.TouchEvent); } catch (_) {}
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart as any);
      el.removeEventListener('touchmove', onTouchMove as any);
      el.removeEventListener('touchend', onTouchEnd as any);
    };
  }, [isPanning]);

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
  const bounds = getBounds(newScale);
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
  }, [scale, tx, ty, maxScale, getBounds]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        overflow: "hidden",
          // Allow vertical page scrolling when image is not zoomed. When zoomed or
          // panning/pinching, disable touch scrolling so gestures control the image.
          touchAction: scale > 1 || isPanning || pinchRef.current ? "none" : "pan-y",
        display: "block",
        width: "100%",
        height: isFullscreen ? "100%" : (isTile ? "100%" : undefined),
        boxSizing: "border-box",
        ...style,
      }}
    onDragStart={(e) => e.preventDefault()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    /* Native touch listeners are attached in an effect with passive: false so
      we can call preventDefault only when needed (pinch or panning). */
    >
      <img
        {...rest}
        ref={imgRef}
        src={src}
        alt={alt}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: isPanning ? "none" : "transform 0.2s ease-out",
          display: "block",
          width: isTile ? "100%" : "auto",
          maxWidth: isTile ? undefined : "100%",
          height: isFullscreen ? "100%" : (isTile ? "100%" : "auto"),
          margin: isTile ? undefined : "0 auto",
          objectFit: isFullscreen ? "contain" : (isTile ? "cover" : "contain"),
          objectPosition: "center center",
          userSelect: "none",
          pointerEvents: "auto",
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          handleDoubleTap(e.clientX, e.clientY);
        }}
        onDragStart={(e) => e.preventDefault()}
        draggable={false}
      />
    </div>
  );
}

export default ImageZoom;
