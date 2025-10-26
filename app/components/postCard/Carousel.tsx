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

  // refs for carousel functionality
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const imgRefs = useRef<Array<HTMLImageElement | null>>([]);
  const isMultipostInFeedRef = useRef(false);
  // Keep a state copy so we can react to detection (apply height, etc.)
  const [isMultipostInFeed, setIsMultipostInFeed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<Array<{ width: number; height: number } | null>>([]);
  // Stable per-index callbacks for ImageZoom onDimensionsChange to avoid
  // recreating an inline function every render which can cause parent/child
  // effect loops when the child calls the callback during mount/load.
  const dimsCallbacksRef = useRef<Array<((d: { width: number; height: number }) => void) | undefined>>([]);

  // Initialize dimensions array
  useEffect(() => {
    setImageDimensions(new Array(imageUrls.length).fill(null));
    // (re)create per-index dimension callbacks when the image list changes
    dimsCallbacksRef.current = new Array(imageUrls.length).fill(undefined).map((_, i) => {
      return (dimensions: { width: number; height: number }) => handleDimensionsChange(i, dimensions);
    });
  }, [imageUrls.length]);

  const handleDimensionsChange = useCallback((idx: number, dimensions: { width: number; height: number }) => {
    setImageDimensions(prev => {
      const newDims = [...prev];
      newDims[idx] = dimensions;
      return newDims;
    });
    // If this is the current image, update height immediately
    if (idx === index && isMultipostInFeedRef.current && wrapperRef.current) {
      wrapperRef.current.style.height = `${dimensions.height}px`;
    }
  }, [index]);

  // Determine if this carousel is in a multipost card in the feed and check desktop
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper) {
      const isMulti = wrapper.closest('.feed .card.multipost') !== null;
      isMultipostInFeedRef.current = isMulti;
      setIsMultipostInFeed(isMulti);
    }
    const mediaQuery = window.matchMedia('(min-width: 900px)');
    setIsDesktop(mediaQuery.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [wrapperRef]);

  // If the carousel is in a multipost card and dimensions are known,
  // ensure the wrapper height matches the current image so the panel
  // adapts to the image size like before.
  useEffect(() => {
    if (!isMultipostInFeed) return;
    const dims = imageDimensions[index];
    if (dims && wrapperRef.current) {
      wrapperRef.current.style.height = `${dims.height}px`;
    }
  }, [isMultipostInFeed, index, imageDimensions]);

  const { handleMediaClick, handleMediaDblClick } = useMediaClick({
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
              onClick={handleMediaClick}
              onDoubleClick={handleMediaDblClick}
              role="button"
              tabIndex={0}
            >
              <ImageZoom
                src={u}
                alt={alts[idx] || `Photo ${idx + 1}`}
                isActive={idx === index}
                lazy={idx !== index}
                // Always pass a stable callback; we only apply the height
                // when we detect multipost layout. This lets ImageZoom
                // report dimensions early while avoiding unstable inline
                // callbacks that cause render loops.
                onDimensionsChange={dimsCallbacksRef.current[idx]}
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
