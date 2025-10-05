import { memo } from "react";
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
}: CarouselProps) {
  const { index, setIndex, trackRef, prev, next, carouselTouchProps } = useCarousel({
    imageUrls,
    allowCarouselTouch,
    pathname,
  });

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
        style={{ touchAction: 'pan-y' }}
      >
        {imageUrls.map((u: string, idx: number) => (
          <div
            className="carousel-slide"
            key={idx}
            role="listitem"
            aria-roledescription="slide"
            aria-label={`${idx + 1} of ${imageUrls.length}`}
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
                onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => (e.currentTarget.classList.add("loaded"))}
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
