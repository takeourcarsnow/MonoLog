import React, { useEffect, useRef, useState } from "react";

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
  setPreviewLoaded
}: CarouselViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

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

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null || !trackRef.current || containerWidth === 0) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    trackRef.current.style.transform = `translateX(-${index * containerWidth - touchDeltaX.current}px)`;
  };

  const onTouchEnd = () => {
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

  if (dataUrls.length === 0) return null;

  return (
    <div
      className="carousel-container"
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="carousel-viewport">
        <div
          className="carousel-track"
          ref={trackRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {dataUrls.map((u, idx) => (
            <div key={idx} className="carousel-slide">
              <img
                src={u || "/logo.svg"}
                alt={Array.isArray(alt) ? (alt[idx] || `Image ${idx + 1}`) : (alt || `Image ${idx + 1}`)}
                onLoad={() => setPreviewLoaded(true)}
                onError={() => setPreviewLoaded(true)}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
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

          <div className="carousel-dots">
            {dataUrls.map((_, i) => (
              <button
                key={i}
                className={`carousel-dot ${i === index ? 'active' : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
