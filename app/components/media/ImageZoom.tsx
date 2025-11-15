/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { Props } from "@/app/components/imageZoom/types";
import { useZoomState } from "@/app/components/imageZoom/hooks/useZoomState";
import { useZoomEvents } from "@/app/components/imageZoom/hooks/useZoomEvents";
import { useImageSizing } from "@/app/components/imageZoom/hooks/useImageSizing";

export function ImageZoom({ src, fallbackSrc, alt, className, style, maxScale = 2, isActive = true, isFullscreen = false, instanceId, lazy = false, rootMargin = "50px", onDimensionsChange, ...rest }: Props) {
  const [isVisible, setIsVisible] = useState(!lazy);
  const [hasError, setHasError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
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

  // Reset fallback state when src changes
  useEffect(() => {
    setUseFallback(false);
    setHasError(false);
  }, [src]);
  useEffect(() => {
    const img = state.imgRef.current;
    if (!img) return;

    const checkLoaded = () => {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add("loaded");
        // If the image was already loaded (cache) and the parent
        // expects dimensions (e.g. carousel wrapper sizing), ensure
        // we notify the parent now. This covers cases where the
        // native onLoad handler doesn't fire because the image was
        // cached and ResizeObservers haven't run yet.
        try {
          if (onDimensionsChange && state.containerRectRef) {
            let rect = state.containerRectRef.current;
            if ((!rect || !rect.width || !rect.height) && state.containerRef.current) {
              const r = state.containerRef.current.getBoundingClientRect();
              rect = { width: Math.round(r.width), height: Math.round(r.height) };
            }
            if (rect) onDimensionsChange(rect);
          }
        } catch (_) {
          // ignore measurement errors
        }
      }
    };

    // Check immediately in case image is already cached
    checkLoaded();

    // Also check after a short delay in case load event is delayed
    const timeout = setTimeout(checkLoaded, 100);

    return () => clearTimeout(timeout);
  }, []);

  // Force add loaded class after a timeout to prevent images from staying invisible
  useEffect(() => {
    const img = state.imgRef.current;
    if (!img) return;

    // Add loaded class immediately to ensure visibility
    img.classList.add("loaded");

    const forceLoadedTimer = setTimeout(() => {
      if (!img.classList.contains("loaded")) {
        img.classList.add("loaded");
      }
    }, 1000); // Reduced to 1 second

    return () => clearTimeout(forceLoadedTimer);
  }, []);

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
          src={useFallback && fallbackSrc ? fallbackSrc : (src || undefined)}
          alt={alt}
          // Honor the component's lazy prop but explicitly set the
          // native loading attribute so browsers start fetching images
          // for carousels / single media immediately when lazy is false.
          loading={lazy ? 'lazy' : 'eager'}
          // Async decoding to avoid blocking the main thread during decode
          decoding="sync"
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
              // allow the image to inherit the container's rounding so corners
              // are visible even when transforms occur (container still clips)
              borderRadius: 'inherit',
            background: isFullscreen ? "#000" : undefined,
            // Hint to browsers to avoid special low-quality resampling while
            // animating transforms. Keep image-rendering default (auto) but
            // ensure high-quality compositing where supported.
            imageRendering: "auto",
          }}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth === 0 || img.naturalHeight === 0) {
              // Image loaded but is broken (e.g., 0x0 or invalid)
              if (fallbackSrc && !useFallback) {
                setUseFallback(true);
                setHasError(false);
              } else {
                setHasError(true);
              }
            } else {
              // Normal successful load
              img.classList.add("loaded");
              setHasError(false);
              // Try to provide fresh container dimensions to the parent.
              // Prefer the cached containerRectRef, but fall back to measuring
              // the container element directly because the ResizeObserver that
              // populates containerRectRef may not have run yet on first load
              // (this caused the carousel panel to not resize until navigating
              // to the next image).
              try {
                let rect = state.containerRectRef.current;
                if ((!rect || !rect.width || !rect.height) && state.containerRef.current) {
                  const r = state.containerRef.current.getBoundingClientRect();
                  rect = { width: Math.round(r.width), height: Math.round(r.height) };
                }
                if (onDimensionsChange && rect) {
                  onDimensionsChange(rect);
                }
              } catch (_) {
                // ignore measurement errors
              }
            }
            // Call the passed onLoad prop if provided
            if (rest.onLoad) {
              rest.onLoad(e);
            }
          }}
          onError={(e) => {
            if (fallbackSrc && !useFallback) {
              setUseFallback(true);
              setHasError(false);
            } else {
              e.currentTarget.classList.add("loaded");
              setHasError(true);
            }
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
            borderRadius: 'inherit',
          }}
        />
      )}
      {hasError && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--bg-elev)",
            color: "var(--text-secondary)",
            fontSize: "14px",
            borderRadius: "inherit",
          }}
        >
          Failed to load image
        </div>
      )}
    </div>
  );
}

export default ImageZoom;