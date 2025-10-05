import React, { useLayoutEffect } from "react";
import Image from "next/image";

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
  toast
  , setPreviewLoaded
}: CarouselViewProps) {
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
    if (e.key === 'ArrowRight') setIndex(i => Math.min(dataUrls.length - 1, i + 1));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    if (trackRef.current) {
      const el = trackRef.current;
      const first = el.children[0] as HTMLElement | undefined;
      const w = first ? first.getBoundingClientRect().width : (el.parentElement ? el.parentElement.clientWidth : el.clientWidth);
      trackRef.current.style.transform = `translateX(-${index * w + touchDeltaX.current}px)`;
    }
  };

  const onTouchEnd = () => {
    if (touchStartX.current == null) return;
    const delta = touchDeltaX.current;
    const threshold = 40;
    let target = index;
    if (delta > threshold) target = Math.max(0, index - 1);
    else if (delta < -threshold) target = Math.min(dataUrls.length - 1, index + 1);
    setIndex(target);
    if (trackRef.current) {
      const el = trackRef.current;
      const first = el.children[0] as HTMLElement | undefined;
      const w = first ? first.getBoundingClientRect().width : (el.parentElement ? el.parentElement.clientWidth : el.clientWidth);
      trackRef.current.style.transform = `translateX(-${target * w}px)`;
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  // Ensure slide & track widths are explicit and transform aligns to pixels.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const wrapper = el.parentElement as HTMLElement | null;
    const recalc = () => {
      const w = wrapper ? wrapper.clientWidth : el.clientWidth;
      if (!w) return;
      // set each slide width explicitly and set track total width
      Array.from(el.children).forEach((child) => {
        (child as HTMLElement).style.width = `${w}px`;
      });
      el.style.width = `${(dataUrls.length || 1) * w}px`;
      // ensure CSS-like transition is present when we set transform programmatically
      el.style.transition = 'transform 320ms cubic-bezier(.2,.8,.2,1)';
      el.style.transform = `translateX(-${index * w}px)`;
    };
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [dataUrls.length, index, trackRef]);

  return (
    <div style={{ width: '100%' }}>
      <div className="carousel-wrapper" tabIndex={0} onKeyDown={onKeyDown}>
        <div
          className="carousel carousel-track"
          ref={trackRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          role="list"
        >
          {dataUrls.map((u, idx) => (
            <div
              className="carousel-slide"
              key={idx}
              role="listitem"
              aria-roledescription="slide"
              aria-label={`Preview ${idx + 1} of ${dataUrls.length}`}
              style={{ position: 'relative', width: '100%', aspectRatio: '4/3', minHeight: 220 }}
            >
              <img
                alt={Array.isArray(alt) ? (alt[idx] || '') : (alt || `Preview ${idx + 1}`)}
                src={u || "/logo.svg"}
                style={{ objectFit: 'contain', width: '100%', height: '100%', display: 'block' }}
                onLoad={() => setPreviewLoaded(true)}
                onError={() => setPreviewLoaded(true)}
              />
            </div>
          ))}
        </div>

        <button className="carousel-arrow left" onClick={() => setIndex(i => Math.max(0, i - 1))} aria-label="Previous image">‹</button>
        <button className="carousel-arrow right" onClick={() => setIndex(i => Math.min(dataUrls.length - 1, i + 1))} aria-label="Next image">›</button>

        <div className="carousel-dots" aria-hidden="false">
          {dataUrls.map((_, i) => (
            <button key={i} className={`dot ${i === index ? 'active' : ''}`} onClick={() => setIndex(i)} aria-label={`Show preview ${i + 1}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
