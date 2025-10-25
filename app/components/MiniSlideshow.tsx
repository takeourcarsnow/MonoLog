"use client";

import { useState, useEffect } from "react";
import { OptimizedImage } from "./OptimizedImage";
import { isImageLoaded as cacheIsImageLoaded, markImageLoaded as cacheMarkImageLoaded } from "@/src/lib/cache/calendarCache";

interface MiniSlideshowProps {
  imageUrls: string[];
  size?: number;
  fill?: boolean;
  // If false, MiniSlideshow will avoid rendering/loading images that
  // haven't previously been marked as loaded in the session cache.
  allowLoad?: boolean;
}

export function MiniSlideshow({ imageUrls, size = 30, fill = false, allowLoad = true }: MiniSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isFading, setIsFading] = useState(false);
  const [initialFadeDone, setInitialFadeDone] = useState(false);
  // Duration (ms) for the cross-fade between slides
  const transitionDuration = 600;

  // Preload images and mark them in the session cache so they render fast.
  useEffect(() => {
    imageUrls.forEach(url => {
      if (!cacheIsImageLoaded(url)) {
        const img = new Image();
        img.src = url;
        img.onload = () => cacheMarkImageLoaded(url);
      }
    });
  }, [imageUrls]);

  // Slide interval with cross-fade: when advancing, keep the previous
  // index mounted and toggle `isFading` to animate the opacity.
  useEffect(() => {
    if (imageUrls.length <= 1) return;

    const interval = setInterval(() => {
      setPrevIndex((prev) => {
        // store the current index as previous for the fade
        return (typeof prev === 'number') ? null : currentIndex;
      });

      // compute next index and start transition
      const next = (currentIndex + 1) % imageUrls.length;
      setPrevIndex(currentIndex);
      setCurrentIndex(next);
      setIsFading(false);
      // start fade on next frame to ensure CSS transition runs
      requestAnimationFrame(() => requestAnimationFrame(() => setIsFading(true)));
      // clear prev after transition completes
      const t = window.setTimeout(() => {
        setPrevIndex(null);
        setIsFading(false);
      }, transitionDuration);

      // store timeout id to clear if effect re-runs
      return () => window.clearTimeout(t);
    }, 8000); // Change every 8 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrls.length, currentIndex]);

  // Initial mount fade so the slideshow doesn't pop instantly when the
  // calendar view is shown. We only run this once per component mount.
  useEffect(() => {
    if (!initialFadeDone && imageUrls.length > 0) {
      // start from invisible -> fade in
      setIsFading(false);
      // ensure the browser has applied the initial styles
      requestAnimationFrame(() => requestAnimationFrame(() => setIsFading(true)));
      const t = window.setTimeout(() => {
        setIsFading(false);
        setInitialFadeDone(true);
      }, transitionDuration);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (imageUrls.length === 0) return null;

  const currentUrl = imageUrls[currentIndex];
  const isLoaded = cacheIsImageLoaded(currentUrl);

  return (
    <div
      className="mini-slideshow"
      style={fill ? {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: 'inherit',
        overflow: 'hidden',
      } : {
        width: size,
        height: size,
        position: 'absolute',
        top: 8,
        right: 8,
        borderRadius: 4,
        overflow: 'hidden',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Layer previous and current images to cross-fade between slides. */}
      {prevIndex != null && allowLoad ? (
        <OptimizedImage
          key={`prev-${prevIndex}`}
          src={imageUrls[prevIndex]}
          alt=""
          width={fill ? undefined : size}
          height={fill ? undefined : size}
          fill={fill}
          unoptimized={false}
          sizes={fill ? "(max-width: 640px) 86px, 153px" : `${size}px`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: isFading ? 0 : 1,
            transition: `opacity ${transitionDuration}ms ease-in-out`,
          }}
          placeholder={"empty"}
          loading={"eager"}
          disableLoadingTransition={true}
        />
      ) : null}

      {allowLoad ? (
        <OptimizedImage
          key={`curr-${currentIndex}`}
          src={currentUrl}
          alt=""
          width={fill ? undefined : size}
          height={fill ? undefined : size}
          fill={fill}
          unoptimized={false}
          sizes={fill ? "(max-width: 640px) 86px, 153px" : `${size}px`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: prevIndex != null ? (isFading ? 1 : 0) : (!initialFadeDone ? (isFading ? 1 : 0) : 1),
            transition: `opacity ${transitionDuration}ms ease-in-out`,
          }}
          placeholder={"empty"}
          loading={"eager"}
          disableLoadingTransition={true}
          onLoad={() => { try { cacheMarkImageLoaded(currentUrl); } catch (e) {} }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'var(--bg-elev)' }} aria-hidden />
      )}
    </div>
  );
}