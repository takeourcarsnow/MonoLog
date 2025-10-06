import { memo, useEffect, useRef, useState, useCallback } from "react";
import ImageZoom from "../ImageZoom";
import { useCarousel } from "./hooks/useCarousel";
import { useMediaClick } from "./hooks/useMediaClick";

interface CarouselProps {
  imageUrls: string[];
  alts: string[];
  postHref: string;
  isFavorite: boolean;
  toggleFavoriteWithAuth: () => void;
  showFavoriteFeedback: (action: 'adding' | 'removing') => void;
  pathname: string;
  allowCarouselTouch?: boolean;
  openFullscreen?: (src: string) => void;
  onImageIndexChange?: (index: number) => void;
}

export const Carousel = memo(function Carousel({
  imageUrls,
  alts,
  postHref,
  isFavorite,
  toggleFavoriteWithAuth,
  showFavoriteFeedback,
  pathname,
  allowCarouselTouch,
  openFullscreen,
  onImageIndexChange,
}: CarouselProps) {
  const { index, setIndex, trackRef, prev, next, carouselTouchProps } = useCarousel({
    imageUrls,
    allowCarouselTouch,
    pathname,
    onIndexChange: onImageIndexChange,
  });

  // refs and state to measure slide image heights so the wrapper can resize
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const imgRefs = useRef<Array<HTMLImageElement | null>>([]);
  const [heights, setHeights] = useState<number[]>([]);
  const [wrapperHeight, setWrapperHeight] = useState<string | number>('auto');

  const measureImage = useCallback((idx: number) => {
    const img = imgRefs.current[idx];
    if (!img) return;
    const wrapper = wrapperRef.current;
    // Prefer computing expected displayed height from natural dimensions
    const natW = img.naturalWidth || 0;
    const natH = img.naturalHeight || 0;
    let h: number | null = null;
    if (natW > 0 && natH > 0 && wrapper) {
      const containerW = wrapper.clientWidth || wrapper.offsetWidth || wrapper.getBoundingClientRect().width;
      if (containerW > 0) {
        h = Math.round((natH * containerW) / natW);
      }
    }
    // Fallback to measured offsetHeight if natural dims or wrapper width unavailable
    if (h == null || !isFinite(h) || h === 0) {
      h = img.offsetHeight || img.getBoundingClientRect().height || null;
    }
    if (h == null) return;
    setHeights(prev => {
      const copy = prev.slice();
      copy[idx] = h as number;
      return copy;
    });
    // If this is the active slide, update wrapper height immediately
    if (idx === index) {
      setWrapperHeight(h as number);
    }
  }, [index]);

  // Update wrapper height whenever the active index or measured heights change
  useEffect(() => {
    const h = heights[index];
    if (typeof h === 'number') setWrapperHeight(h);
    else setWrapperHeight('auto');
    // If the active slide hasn't been measured yet, attempt a re-measure
    if (h == null) {
      requestAnimationFrame(() => measureImage(index));
    }
  }, [index, heights, measureImage]);

  // Re-measure on window resize in case layout changes
  useEffect(() => {
    const onResize = () => {
      imgRefs.current.forEach((img, i) => { if (img) { measureImage(i); } });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measureImage]);

  const { handleMediaClick } = useMediaClick({
    isFavorite,
    toggleFavoriteWithAuth,
    showFavoriteFeedback,
    pathname,
    postHref,
  });

  return (
    <div
      className="carousel-wrapper"
      ref={wrapperRef}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
      }}
      tabIndex={0}
      style={{ height: wrapperHeight === 'auto' ? 'auto' : `${wrapperHeight}px` }}
    >
      <div className="edge-area left" />
      <div className="edge-area right" />
      <div
        className="carousel-track"
        ref={trackRef}
        {...carouselTouchProps}
        role="list"
        style={{ touchAction: 'pan-y' }}
      >
        {imageUrls.map((u: string, idx: number) => (
          <div
            className="carousel-slide"
            key={idx}
            role="listitem"
            aria-roledescription="slide"
            aria-label={`${idx + 1} of ${imageUrls.length}`}
            style={{ minHeight: 0 }}
          >
            <a
              href={postHref}
              className="media-link"
              draggable={false}
              onClick={handleMediaClick}
              onDragStart={(e: React.DragEvent) => e.preventDefault()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handleMediaClick(e as any); }}
            >
              <ImageZoom
                loading="lazy"
                src={u}
                alt={alts[idx] || `Photo ${idx + 1}`}
                isActive={idx === index}
                onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  // preserve existing loaded class
                  e.currentTarget.classList.add("loaded");
                  // store ref and measure
                  imgRefs.current[idx] = e.currentTarget as HTMLImageElement;
                  // measure on next frame to ensure layout applied
                  requestAnimationFrame(() => measureImage(idx));
                }}
                onDragStart={(e: React.DragEvent) => e.preventDefault()}
              />
            </a>
          </div>
        ))}
      </div>
      <button className="carousel-arrow left" onClick={prev} aria-label="Previous image">‹</button>
      <button className="carousel-arrow right" onClick={next} aria-label="Next image">›</button>
      <div className="carousel-dots" aria-hidden="false">
        {imageUrls.map((_, i) => (
          <button
            key={i}
            className={`dot ${i === index ? "active" : ""}`}
            onClick={() => setIndex(i)}
            aria-label={`Show image ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
});
