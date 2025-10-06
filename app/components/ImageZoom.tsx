/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect } from "react";
import { useImageZoomState } from "./ImageZoomState";
import { getBoundsForScale } from "./ImageZoomUtils";
import { useImageZoomTouch } from "./ImageZoomTouch";
import { useImageZoomPointer } from "./ImageZoomPointer";
import { useImageZoomDoubleTap } from "./ImageZoomDoubleTap";
import { useImageZoomAnimation } from "./ImageZoomAnimation";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  maxScale?: number;
  isActive?: boolean;
  isFullscreen?: boolean;
};

export function ImageZoom({ src, alt, className, style, maxScale = 4, isActive = true, isFullscreen = false, ...rest }: Props) {
  const state = useImageZoomState();
  const {
    containerRef,
    imgRef,
    scale,
    setScale,
    tx,
    ty,
    setTxSafe,
    setTySafe,
    setIsPanning,
    isPanning,
    isTile,
    setIsTile,
    scaleRef,
    txRef,
    tyRef,
    flingRaf,
    pointerRaf,
    doubleTapRef,
    pointerActive,
    lastPan,
    startPan,
    lastMoveTs,
    lastMovePos,
    velocity,
    lastDoubleTapAt,
    lastClickAt,
    natural,
  } = state;

  // Detect if this ImageZoom is rendered inside a grid tile so we can
  // use cover/fill styles (center & crop) to make images align nicely.
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

  // Reset zoom state when src changes (e.g., when carousel switches images)
  useEffect(() => {
    setScale(1);
    setTxSafe(0);
    setTySafe(0);
  }, [src]);

  // Reset zoom when the image becomes inactive (not visible in carousel)
  useEffect(() => {
    if (!isActive) {
      setScale(1);
      setTxSafe(0);
      setTySafe(0);
    }
  }, [isActive, setScale, setTxSafe, setTySafe]);

  // Set natural dimensions when image loads
  useEffect(() => {
    const img = imgRef.current;
    if (img) {
      if (img.complete) {
        natural.current.w = img.naturalWidth;
        natural.current.h = img.naturalHeight;
      } else {
        const onLoad = () => {
          natural.current.w = img.naturalWidth;
          natural.current.h = img.naturalHeight;
        };
        img.addEventListener('load', onLoad);
        return () => img.removeEventListener('load', onLoad);
      }
    }
  }, [src]);

  const { onTouchStart, onTouchMove, onTouchEnd, reset } = useImageZoomTouch(
    containerRef,
    scale,
    setScale,
    tx,
    ty,
    setTxSafe,
    setTySafe,
    maxScale,
    imgRef,
    natural
  );

  const { onPointerDown, onPointerMove, onPointerUp, springBack, startFling } = useImageZoomPointer(
    scale,
    scaleRef,
    txRef,
    tyRef,
    setTxSafe,
    setTySafe,
    setIsPanning,
    lastPan,
    startPan,
    lastMoveTs,
    lastMovePos,
    velocity,
    pointerActive,
    pointerRaf,
    containerRef,
    imgRef,
    natural
  );

  const { handleDoubleTap, handleTouchEndDoubleTap } = useImageZoomDoubleTap(
    scale,
    setScale,
    tx,
    ty,
    setTxSafe,
    setTySafe,
    maxScale,
    doubleTapRef,
    containerRef,
    imgRef,
    natural,
    lastDoubleTapAt
  );

  const { springBack: animationSpringBack, startFling: animationStartFling, reset: animationReset } = useImageZoomAnimation(
    scale,
    scaleRef,
    txRef,
    tyRef,
    setTxSafe,
    setTySafe,
    setScale,
    containerRef,
    imgRef,
    natural,
    flingRaf
  );

  // Enhanced touch end handler that combines touch and double tap logic
  const onTouchEndCombined: React.TouchEventHandler = (e) => {
    onTouchEnd(e);
    handleTouchEndDoubleTap(e);
  };

  return (
    <div
      ref={containerRef}
      // block clicks that occur immediately after a pinch so parent Links
      // don't interpret the gesture as a tap/click which would navigate or
      // reset the carousel. We use a short time window to allow normal clicks.
      onClick={(e) => {
        const dt = lastDoubleTapAt.current;
        const now = Date.now();
        if (lastClickAt.current && now - lastClickAt.current < 400) {
          // double click
          e.preventDefault();
          e.stopPropagation();
          handleDoubleTap(e.clientX, e.clientY);
          lastDoubleTapAt.current = now;
          lastClickAt.current = null;
        } else if (dt && Date.now() - dt < 700) {
          e.preventDefault();
          e.stopPropagation();
        } else {
          lastClickAt.current = now;
        }
      }}
      className={className}
      style={{
        overflow: "hidden",
        // When zoomed, disable touch action to prevent scrolling
        touchAction: scale > 1 ? "none" : "auto",
        // make the container fill the card width so images can center
        display: "block",
        width: "100%",
        // In profile/grid tiles we want the image to fully fill the square tile area.
        // The tile itself enforces aspect-ratio; giving the wrapper 100% height
        // allows the inner <img> (with object-fit:cover) to crop instead of letterboxing.
        height: isFullscreen ? "100%" : (isTile ? "100%" : undefined),
        boxSizing: "border-box",
        ...style,
      }}
      onDragStart={(e) => e.preventDefault()}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndCombined}
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
          height: isFullscreen ? "100%" : (isTile ? "100%" : "auto"),
          margin: isTile ? undefined : "0 auto",
          objectFit: isFullscreen ? "contain" : (isTile ? "cover" : "contain"),
          objectPosition: "center center",
          userSelect: "none",
          // When zoomed, disable touch action to prevent scrolling
          touchAction: scale > 1 ? "none" : "auto",
          // In fullscreen, allow pointer events to pass through to close button
          pointerEvents: isFullscreen ? "none" : "auto",
        }}
        onDragStart={(e) => e.preventDefault()}
        draggable={false}
      />
    </div>
  );
}

export default ImageZoom;
