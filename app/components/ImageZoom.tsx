/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { Props } from "./imageZoom/types";
import { useZoomState } from "./imageZoom/hooks/useZoomState";
import { useZoomEvents } from "./imageZoom/hooks/useZoomEvents";
import { useImageSizing } from "./imageZoom/hooks/useImageSizing";

export function ImageZoom({ src, alt, className, style, maxScale = 2, isActive = true, isFullscreen = false, instanceId, lazy = false, rootMargin = "50px", onDimensionsChange, ...rest }: Props) {
  const [isVisible, setIsVisible] = useState(!lazy);
  const state = useZoomState();
  const { handlePointerDown, handlePointerMove, handlePointerUp, registerTap } = useZoomEvents({
    ...state,
    maxScale,
    isFullscreen,
    isActive,
    src,
  });
  useImageSizing(state.containerRef, state.imgRef, isFullscreen, src, isActive);

  // Lazy loading with IntersectionObserver
  useEffect(() => {
    if (!lazy || isVisible) return;

    const element = state.containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [lazy, isVisible, rootMargin, state.containerRef]);

  // Ensure loaded class is added even if onLoad doesn't fire (e.g., cached images)
  useEffect(() => {
    const img = state.imgRef.current;
    if (!img) return;

    const checkLoaded = () => {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add("loaded");
      }
    };

    // Check immediately in case image is already cached
    checkLoaded();

    // Also check after a short delay in case load event is delayed
    const timeout = setTimeout(checkLoaded, 100);

    return () => clearTimeout(timeout);
  }, [state.imgRef.current]);

  // Call onDimensionsChange when active and loaded
  useEffect(() => {
    if (isActive && onDimensionsChange && state.containerRectRef.current) {
      onDimensionsChange(state.containerRectRef.current);
    }
  }, [isActive, onDimensionsChange, state.containerRectRef]);

  return (
    <div
      ref={state.containerRef}
      className={`${className ? className + ' ' : ''}monolog-image-zoom`}
      style={{
        overflow: "hidden",
        // inherit parent's border radius so the outer wrapper controls clipping
        borderRadius: 'inherit',
          // When rendered fullscreen we must prevent the browser's native
          // double-tap-to-zoom behavior so our double-tap handler runs on
          // real mobile devices. Otherwise the browser may intercept the
          // second tap and zoom the page instead of sending events to us.
          // For non-fullscreen mode, allow pan-y when unzoomed so the page
          // can still scroll vertically.
          // In fullscreen we fully control gestures — disable native
          // browser touch handling to avoid competing zoom/pinch behavior.
          touchAction: isFullscreen ? "none" : "auto",
        display: "block",
        width: "100%",
        height: isFullscreen ? "100%" : (state.isTile ? "100%" : undefined),
        boxSizing: "border-box",
        ...style,
      }}
    onDragStart={(e) => e.preventDefault()}
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={handlePointerUp}
    /* Native touch listeners are attached in an effect with passive: false so
      we can call preventDefault only when needed (pinch or panning). */
    >
      {isVisible ? (
        <img
          {...rest}
          ref={state.imgRef}
          src={src}
          alt={alt}
          style={{
            // Use a 3D transform to encourage GPU compositing which prevents
            // the browser from temporarily rasterizing the image at lower
            // quality during animated transform updates.
            transform: `translate3d(${state.tx}px, ${state.ty}px, 0) scale(${state.scale})`,
            transformOrigin: "center center",
            transition: state.isTransitioning ? "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
            willChange: "transform",
            transformStyle: "preserve-3d",
            display: "block",
            width: state.isTile ? "100%" : "auto",
            maxWidth: state.isTile ? undefined : "100%",
            height: isFullscreen ? "100%" : (state.isTile ? "100%" : "auto"),
            margin: state.isTile ? undefined : "0 auto",
            objectFit: isFullscreen ? "contain" : (state.isTile ? "cover" : "contain"),
            objectPosition: "center center",
            userSelect: "none",
            pointerEvents: "auto",
            // remove image rounding so the outer container's border-radius clips the image
            borderRadius: 0,
            background: isFullscreen ? "#000" : undefined,
            // Hint to browsers to avoid special low-quality resampling while
            // animating transforms. Keep image-rendering default (auto) but
            // ensure high-quality compositing where supported.
            imageRendering: "auto",
          }}
          onLoad={(e) => {
            e.currentTarget.classList.add("loaded");
            if (onDimensionsChange && state.containerRectRef.current) {
              onDimensionsChange(state.containerRectRef.current);
            }
          }}
          onError={(e) => {
            e.currentTarget.classList.add("loaded");
          }}
          onClick={(e) => {
            e.preventDefault();
            registerTap(e.clientX, e.clientY);
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            // Fallback for browsers that still fire double-click despite onClick
          }}
          onDragStart={(e) => e.preventDefault()}
          draggable={false}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: isFullscreen ? "100%" : (state.isTile ? "100%" : "auto"),
            backgroundColor: "var(--bg-elev)",
            borderRadius: 0,
          }}
        />
      )}
    </div>
  );
}

export default ImageZoom;