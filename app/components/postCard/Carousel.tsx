import { memo, useEffect, useRef, useState, useCallback } from "react";
import dynamic from 'next/dynamic';
const ImageZoom = dynamic(() => import('../ImageZoom'), { ssr: false });
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
  disableMediaNavigation?: boolean;
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
  disableMediaNavigation,
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
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isMultipostInFeedRef = useRef(false);
  const [heights, setHeights] = useState<number[]>([]);
  const [wrapperHeight, setWrapperHeight] = useState<string | number>('auto');

  // Determine if this carousel is in a multipost card in the feed
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper) {
      isMultipostInFeedRef.current = wrapper.closest('.feed .card.multipost') !== null;
    }
  }, [wrapperRef]);

  const measureImage = useCallback((idx: number) => {
    const img = imgRefs.current[idx];
    if (!img) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    // Only measure height for multipost in feed
    if (!isMultipostInFeedRef.current) return;
    // Allow the image to size naturally while we measure. We avoid restoring
    // any previous inline height here so the React-driven inline height
    // (from state) can be applied without being overwritten.
    let maxHeight: number | null = null;
    const vh = window.innerHeight * 0.56;
    maxHeight = Math.min(vh, 720);
    // Prefer the currently rendered/displayed height when available. This
    // ensures the wrapper matches what the user actually sees (especially
    // when CSS like max-height/object-fit is applied). Fall back to
    // computing height from natural dimensions only when necessary.
    const imgRect = img.getBoundingClientRect();
    const displayedH = imgRect.height || img.offsetHeight || img.clientHeight || 0;
    const natW = img.naturalWidth || 0;
    const natH = img.naturalHeight || 0;
    let h: number | null = null;
    if (displayedH && isFinite(displayedH) && displayedH > 0) {
      h = Math.round(displayedH);
      if (maxHeight !== null && h > maxHeight) h = maxHeight;
    } else if (natW > 0 && natH > 0) {
      // Use the image's rendered width to compute expected displayed height
      const renderedW = imgRect.width || img.offsetWidth || wrapper.clientWidth || wrapper.getBoundingClientRect().width;
      h = Math.round((natH * renderedW) / natW);
      if (maxHeight !== null && h > maxHeight) h = maxHeight;
    }
    // Fallback to measured offsetHeight if natural dims or wrapper width unavailable
    if (h == null || !isFinite(h) || h === 0) {
      try {
        // force layout
        const measured = img.offsetHeight || img.getBoundingClientRect().height || null;
        h = measured;
      } catch (_) {
        h = img.offsetHeight || img.getBoundingClientRect().height || null;
      }
      if (maxHeight !== null && h !== null && h > maxHeight) {
        h = maxHeight;
      }
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
    // (no DOM restore here — leave inline height to React state)
  }, [index]);

  // Update wrapper height whenever the active index or measured heights change
  useEffect(() => {
    if (isMultipostInFeedRef.current) {
      const h = heights[index];
      if (typeof h === 'number') setWrapperHeight(h);
      else setWrapperHeight('auto');
      // If the active slide hasn't been measured yet, attempt a re-measure
      if (h == null) {
        requestAnimationFrame(() => measureImage(index));
      }
    } else {
      setWrapperHeight('auto');
    }
  }, [index, heights, measureImage]);

  // Re-measure on window resize in case layout changes
  useEffect(() => {
    if (!isMultipostInFeedRef.current) return;
    const onResize = () => {
      imgRefs.current.forEach((img, i) => { if (img) { measureImage(i); } });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measureImage]);

  // Cleanup: unobserve images when component unmounts or imgRefs change
  useEffect(() => {
    return () => {
      try {
        const obs = resizeObserverRef.current;
        // Snapshot current img refs now so cleanup doesn't access a mutated ref
        const imgsSnapshot = imgRefs.current ? imgRefs.current.slice() : [];
        if (obs) {
          imgsSnapshot.forEach(img => { if (img) try { obs.unobserve(img); } catch (_) {} });
          try { obs.disconnect(); } catch (_) {}
        }
      } catch (_) {}
    };
  }, []);

  // ResizeObserver: observe image size changes (eg. CSS/layout changes) and re-measure
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !isMultipostInFeedRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLImageElement;
        const idx = imgRefs.current.findIndex(i => i === target);
        if (idx >= 0) {
          // Use RAF to ensure layout has settled
          requestAnimationFrame(() => measureImage(idx));
        }
      }
    });
    resizeObserverRef.current = obs;
    return () => {
      try { obs.disconnect(); } catch (_) {}
      resizeObserverRef.current = null;
    };
  }, [measureImage]);

  // Handle cached images that may have already loaded before our onLoad handler ran
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const imgs = wrapper.querySelectorAll('.carousel-track img') as NodeListOf<HTMLImageElement> | null;
    if (!imgs || imgs.length === 0) return;
    imgs.forEach((img, i) => {
      // Populate imgRefs in order so measureImage can find them
      imgRefs.current[i] = img;
      if (isMultipostInFeedRef.current) {
        try { if (resizeObserverRef.current) resizeObserverRef.current.observe(img); } catch (_) {}
      }
      if (img.complete && isMultipostInFeedRef.current) {
        // measure on next frame
        requestAnimationFrame(() => measureImage(i));
      }
    });
  }, [imageUrls, measureImage]);

  const { handleMediaClick } = useMediaClick({
    isFavorite,
    toggleFavoriteWithAuth,
    showFavoriteFeedback,
    pathname,
    postHref,
    disableMediaNavigation: true,
    allowImageClickNavigation: false,
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
        // Allow vertical page scrolling but ensure horizontal drags are
        // delivered to our JS handlers so the carousel can change slides.
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
            <div
              className="media-link"
              draggable={false}
              onDragStart={(e: React.DragEvent) => e.preventDefault()}
              role="button"
              tabIndex={0}
            >
              <ImageZoom
                src={u}
                alt={alts[idx] || `Photo ${idx + 1}`}
                isActive={idx === index}
                onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  // preserve existing loaded class
                  e.currentTarget.classList.add("loaded");
                  // store ref and measure
                  const imgEl = e.currentTarget as HTMLImageElement;
                  imgRefs.current[idx] = imgEl;
                  // If we have a ResizeObserver, observe this image so we re-measure on CSS/layout-driven size changes
                  if (isMultipostInFeedRef.current) {
                    try {
                      if (resizeObserverRef.current) resizeObserverRef.current.observe(imgEl);
                    } catch (_) {}
                    // measure on next frame to ensure layout applied
                    requestAnimationFrame(() => measureImage(idx));
                  }
                }}
                onDragStart={(e: React.DragEvent) => e.preventDefault()}
              />
            </div>
          </div>
        ))}
      </div>
      <button className="carousel-arrow left" onClick={prev} aria-label="Previous image">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button className="carousel-arrow right" onClick={next} aria-label="Next image">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
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
