/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useRef, useState } from "react";

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

  const getBounds = () => {
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
    const scaledW = renderedW * scale;
    const scaledH = renderedH * scale;

    const maxTx = Math.max(0, (scaledW - containerW) / 2);
    const maxTy = Math.max(0, (scaledH - containerH) / 2);

    return { maxTx, maxTy };
  };

  const handleDoubleTap = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (scale > 1) {
      // Zoom out to center
      setScale(1);
      setTx(0);
      setTy(0);
      // Dispatch zoom end event
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('monolog:zoom_end'));
        } catch (_) {}
      }
    } else {
      // Zoom in to double tap location
      setScale(maxScale);

      // Calculate translation to center the tap point
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      const newTx = -(localX * maxScale - containerWidth / 2);
      const newTy = -(localY * maxScale - containerHeight / 2);

      // Clamp to bounds
      const bounds = getBounds();
      const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
      const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

      setTx(clampedTx);
      setTy(clampedTy);

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

    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning || !panStartRef.current) return;

    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;

    const newTx = panStartRef.current.tx + dx;
    const newTy = panStartRef.current.ty + dy;

    const bounds = getBounds();
    const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
    const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

    setTx(clampedTx);
    setTy(clampedTy);

    // Prevent parent components from receiving swipe gestures when panning
    e.stopPropagation();
    e.preventDefault();
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    panStartRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale <= 1) return;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsPanning(true);
      panStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        tx: tx,
        ty: ty
      };
      // Prevent parent components from receiving touch start when starting to pan
      e.stopPropagation();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPanning || !panStartRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - panStartRef.current.x;
    const dy = touch.clientY - panStartRef.current.y;

    const newTx = panStartRef.current.tx + dx;
    const newTy = panStartRef.current.ty + dy;

    const bounds = getBounds();
    const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
    const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

    setTx(clampedTx);
    setTy(clampedTy);

    // Prevent parent components from receiving swipe gestures when panning
    e.stopPropagation();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const now = Date.now();

      if (lastDoubleTapRef.current && now - lastDoubleTapRef.current < 300) {
        lastDoubleTapRef.current = null;
        handleDoubleTap(touch.clientX, touch.clientY);
      } else {
        lastDoubleTapRef.current = now;
        setTimeout(() => {
          if (lastDoubleTapRef.current === now) {
            lastDoubleTapRef.current = null;
          }
        }, 310);
      }
    }

    setIsPanning(false);
    panStartRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        overflow: "hidden",
        touchAction: scale > 1 ? "none" : "auto",
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
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
          touchAction: scale > 1 ? "none" : "auto",
          pointerEvents: isFullscreen ? "none" : "auto",
        }}
        onDragStart={(e) => e.preventDefault()}
        draggable={false}
      />
    </div>
  );
}

export default ImageZoom;
