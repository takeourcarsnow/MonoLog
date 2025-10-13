import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LoadingBadge } from "./LoadingBadge";
import { useZoomState } from "../imageZoom/hooks/useZoomState";
import { getBounds } from "../imageZoom/utils/zoomUtils";

interface CarouselViewProps {
  dataUrls: string[];
  alt: string | string[];
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  trackRef: React.RefObject<HTMLDivElement>;
  touchStartX: React.MutableRefObject<number | null>;
  touchDeltaX: React.MutableRefObject<number>;
  setEditingIndex: React.Dispatch<React.SetStateAction<number>>;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  fileActionRef: React.MutableRefObject<'append' | 'replace'>;
  replaceIndexRef: React.MutableRefObject<number | null>;
  setCameraOpen: React.Dispatch<React.SetStateAction<boolean>>;
  videoRef: React.RefObject<HTMLVideoElement>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  cameraInputRef: React.RefObject<HTMLInputElement>;
  toast: any;
  setPreviewLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  processing: boolean;
  previewLoaded: boolean;
  editing: boolean;
}

export function CarouselView({
  dataUrls,
  alt,
  index,
  setIndex,
  trackRef,
  touchStartX,
  touchDeltaX,
  setEditingIndex,
  setEditing,
  fileActionRef,
  replaceIndexRef,
  setCameraOpen,
  videoRef,
  streamRef,
  cameraInputRef,
  toast,
  setPreviewLoaded,
  processing,
  previewLoaded,
  editing
}: CarouselViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Zoom state
  const zoomState = useZoomState();
  const {
    scale,
    setScale,
    tx,
    setTx,
    ty,
    setTy,
    isPanning,
    setIsPanning,
    isTransitioning,
    setIsTransitioning,
    lastDoubleTapRef,
    lastTapTimeoutRef,
    lastEventTimeRef,
    panStartRef,
    naturalRef,
    touchStartRef,
    pointerStartRef,
    movedRef,
    TAP_MOVE_THRESHOLD,
    scaleRef,
    txRef,
    tyRef,
    pinchRef,
    wheelEnabledRef,
    instanceIdRef,
  } = zoomState;

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Listen to slider drag events
  useEffect(() => {
    // We ignore events that originate from this component instance by
    // checking event.detail.source === SELF_SOURCE.
    const SELF_SOURCE = 'uploader_carousel';
    const start = (ev: Event) => {
      const cev = ev as CustomEvent<any>;
      if (cev?.detail?.source === SELF_SOURCE) return;
      setIsDragging(true);
    };
    const end = (ev: Event) => {
      const cev = ev as CustomEvent<any>;
      if (cev?.detail?.source === SELF_SOURCE) return;
      setIsDragging(false);
    };
    window.addEventListener('monolog:carousel_drag_start', start);
    window.addEventListener('monolog:carousel_drag_end', end);
    return () => {
      window.removeEventListener('monolog:carousel_drag_start', start);
      window.removeEventListener('monolog:carousel_drag_end', end);
    };
  }, []);

  // Add touch event listeners with passive: false to allow preventDefault
  useEffect(() => {
    const track = trackRef.current;
    if (!track || editing) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (isDragging || scale > 1) return;
      e.stopPropagation();
      e.preventDefault();
      // Notify the app that an inner carousel drag is starting so the
      // outer AppShell swiper can temporarily disable touch navigation.
  try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_start', { detail: { source: 'uploader_carousel' } })); } catch (_) {}
      touchStartX.current = e.touches[0].clientX;
      touchDeltaX.current = 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging || scale > 1) return;
      e.stopPropagation();
      e.preventDefault();
      if (touchStartX.current == null || !trackRef.current || containerWidth === 0) return;
      touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
      const position = index * containerWidth - touchDeltaX.current;
      const clampedPosition = Math.max(0, Math.min((dataUrls.length - 1) * containerWidth, position));
      trackRef.current.style.transform = `translateX(-${clampedPosition}px)`;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDragging || scale > 1) return;
      e.stopPropagation();
      e.preventDefault();
      // Notify the app that the inner carousel drag has ended so the outer
      // AppShell swiper can re-enable touch navigation.
  try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_end', { detail: { source: 'uploader_carousel' } })); } catch (_) {}
      if (touchStartX.current == null || containerWidth === 0) return;
      const delta = touchDeltaX.current;
      const threshold = 50;
      if (Math.abs(delta) > threshold) {
        // Handle swipe
        let target = index;
        if (delta > threshold) target = Math.max(0, index - 1);
        else if (delta < -threshold) target = Math.min(dataUrls.length - 1, index + 1);
        setIndex(target);
      } else {
        // Handle tap
        registerTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
      touchStartX.current = null;
      touchDeltaX.current = 0;
    };

    track.addEventListener('touchstart', handleTouchStart, { passive: false });
    track.addEventListener('touchmove', handleTouchMove, { passive: false });
    track.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      track.removeEventListener('touchstart', handleTouchStart);
      track.removeEventListener('touchmove', handleTouchMove);
      track.removeEventListener('touchend', handleTouchEnd);
    };
  }, [containerWidth, index, dataUrls.length, setIndex, editing, isDragging, touchDeltaX, touchStartX, trackRef]);

  // Update track transform when index or container width changes
  useEffect(() => {
    if (trackRef.current && containerWidth > 0) {
      trackRef.current.style.transform = `translateX(-${index * containerWidth}px)`;
    }
  }, [index, containerWidth, trackRef]);

  // Reset zoom when changing images
  useEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
    wheelEnabledRef.current = false;
  }, [index, setScale, setTx, setTy]);

  // Unified tap/double-tap registration helper
  const registerTap = (clientX: number, clientY: number) => {
    const now = Date.now();
    // Ignore duplicate events from different event systems
    if (lastEventTimeRef.current && now - lastEventTimeRef.current < 50) return;
    lastEventTimeRef.current = now;

    if (lastDoubleTapRef.current && now - lastDoubleTapRef.current < 300) {
      // Detected double-tap
      lastDoubleTapRef.current = null;
      if (lastTapTimeoutRef.current) {
        clearTimeout(lastTapTimeoutRef.current as any);
        lastTapTimeoutRef.current = null;
      }
      handleDoubleTap(clientX, clientY);
    } else {
      lastDoubleTapRef.current = now;
      if (lastTapTimeoutRef.current) {
        clearTimeout(lastTapTimeoutRef.current as any);
      }
      lastTapTimeoutRef.current = window.setTimeout(() => {
        if (lastDoubleTapRef.current === now) lastDoubleTapRef.current = null;
        lastTapTimeoutRef.current = null;
      }, 310) as any;
    }
  };

  // Handle double-tap to zoom in/out
  const handleDoubleTap = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Enable smooth transition for zoom operations
    setIsTransitioning(true);

    if (scale > 1) {
      // Zoom out to center
      setScale(1);
      setTx(0);
      setTy(0);
      wheelEnabledRef.current = false;
      // Disable transition after animation completes
      setTimeout(() => setIsTransitioning(false), 300);
    } else {
      // Zoom in to double tap location
      const zoomScale = 2;
      setScale(zoomScale);

      // Calculate translation to center the tap point
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      const newTx = -(localX - containerWidth / 2) * zoomScale;
      const newTy = -(localY - containerHeight / 2) * zoomScale;

      // Clamp to bounds
      const bounds = getBounds(containerRef, { current: null }, naturalRef, zoomScale);
      const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
      const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

      setTx(clampedTx);
      setTy(clampedTy);
      // Allow wheel zoom now that the user explicitly triggered zoom
      wheelEnabledRef.current = true;

      // Disable transition after animation completes
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  // Handle pointer down for panning
  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    // record pointer start to distinguish tap vs drag
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;

    // Disable transitions during panning for instant response
    setIsTransitioning(false);
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx: tx,
      ty: ty
    };

    e.preventDefault();
  };

  // Handle pointer move for panning
  const handlePointerMove = (e: React.PointerEvent) => {
    // mark moved if movement exceeds threshold
    if (pointerStartRef.current) {
      const dxStart = e.clientX - pointerStartRef.current.x;
      const dyStart = e.clientY - pointerStartRef.current.y;
      if (!movedRef.current && Math.hypot(dxStart, dyStart) > TAP_MOVE_THRESHOLD) movedRef.current = true;
    }

    if (!isPanning || !panStartRef.current) return;

    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;

    const newTx = panStartRef.current.tx + dx;
    const newTy = panStartRef.current.ty + dy;

    const bounds = getBounds(containerRef, { current: null }, naturalRef, scale);
    const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
    const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

    setTx(clampedTx);
    setTy(clampedTy);

    // Prevent parent components from receiving swipe gestures when panning
    e.stopPropagation();
    e.preventDefault();
  };

  // Handle pointer up
  const handlePointerUp = (e: React.PointerEvent) => {
    // Register tap for mouse and touch events if not moved
    if (!movedRef.current) {
      registerTap(e.clientX, e.clientY);
    }

    setIsPanning(false);
    panStartRef.current = null;
    pointerStartRef.current = null;
    movedRef.current = false;
  };

  // Attach native touch listeners to allow preventDefault
  useEffect(() => {
    // Touch handling is done by pointer events and onClick
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
    if (e.key === 'ArrowRight') setIndex(i => Math.min(dataUrls.length - 1, i + 1));
  };

  if (dataUrls.length === 0) return null;

  return (
    <div
      className="carousel-container no-swipe"
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="carousel-viewport">
        <LoadingBadge processing={processing} previewLoaded={previewLoaded} />
        <div
          className="carousel-track"
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {dataUrls.map((u, idx) => (
            <div 
              key={idx} 
              className="carousel-slide"
              style={{
                transform: idx === index ? `translate(${tx}px, ${ty}px) scale(${scale})` : undefined,
                transformOrigin: idx === index ? "center center" : undefined,
                transition: idx === index && isTransitioning ? "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
              }}
            >
              <Image
                className="no-swipe"
                src={u || "/logo.svg"}
                alt={Array.isArray(alt) ? (alt[idx] || `Image ${idx + 1}`) : (alt || `Image ${idx + 1}`)}
                fill
                sizes="100%"
                style={{ objectFit: 'contain' }}
                onLoadingComplete={() => setPreviewLoaded(true)}
                onError={() => setPreviewLoaded(true)}
                onClick={idx === index ? (e) => {
                  e.preventDefault();
                  registerTap(e.clientX, e.clientY);
                } : undefined}
                onDoubleClick={idx === index ? (e) => {
                  e.preventDefault();
                  // Fallback for browsers that still fire double-click despite onClick
                } : undefined}
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {dataUrls.length > 1 && (
        <>
          <button
            className="carousel-nav carousel-nav-prev"
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
            aria-label="Previous image"
          >
            ‹
          </button>

          <button
            className="carousel-nav carousel-nav-next"
            onClick={() => setIndex(i => Math.min(dataUrls.length - 1, i + 1))}
            disabled={index === dataUrls.length - 1}
            aria-label="Next image"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
