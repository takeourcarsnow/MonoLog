/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { Props } from "./imageZoom/types";
import { useZoomState } from "./imageZoom/hooks/useZoomState";
import { useZoomEvents } from "./imageZoom/hooks/useZoomEvents";
import { useImageSizing } from "./imageZoom/hooks/useImageSizing";

export function ImageZoom({ src, alt, className, style, maxScale = 2, isActive = true, isFullscreen = false, instanceId, ...rest }: Props) {
  const state = useZoomState();
  const { handlePointerDown, handlePointerMove, handlePointerUp, registerTap } = useZoomEvents({
    ...state,
    maxScale,
    isFullscreen,
    isActive,
    src,
  });
  useImageSizing(state.containerRef, state.imgRef, isFullscreen, src);

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
          touchAction: "auto",
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
      <img
        {...rest}
        ref={state.imgRef}
        src={src}
        alt={alt}
        style={{
          transform: `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`,
          transformOrigin: "center center",
          transition: state.isPanning ? "none" : "transform 0.2s ease-out",
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
    </div>
  );
}

export default ImageZoom;