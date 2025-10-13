import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LoadingBadge } from "./LoadingBadge";

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
    const start = () => setIsDragging(true);
    const end = () => setIsDragging(false);
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
      if (isDragging) return;
      e.stopPropagation();
      e.preventDefault();
      touchStartX.current = e.touches[0].clientX;
      touchDeltaX.current = 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) return;
      e.stopPropagation();
      e.preventDefault();
      if (touchStartX.current == null || !trackRef.current || containerWidth === 0) return;
      touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
      const position = index * containerWidth - touchDeltaX.current;
      const clampedPosition = Math.max(0, Math.min((dataUrls.length - 1) * containerWidth, position));
      trackRef.current.style.transform = `translateX(-${clampedPosition}px)`;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDragging) return;
      e.stopPropagation();
      e.preventDefault();
      if (touchStartX.current == null || containerWidth === 0) return;
      const delta = touchDeltaX.current;
      const threshold = 50;
      let target = index;
      if (delta > threshold) target = Math.max(0, index - 1);
      else if (delta < -threshold) target = Math.min(dataUrls.length - 1, index + 1);
      setIndex(target);
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
        >
          {dataUrls.map((u, idx) => (
            <div key={idx} className="carousel-slide">
              <Image
                className="no-swipe"
                src={u || "/logo.svg"}
                alt={Array.isArray(alt) ? (alt[idx] || `Image ${idx + 1}`) : (alt || `Image ${idx + 1}`)}
                fill
                sizes="100%"
                style={{ objectFit: 'contain' }}
                onLoadingComplete={() => setPreviewLoaded(true)}
                onError={() => setPreviewLoaded(true)}
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
