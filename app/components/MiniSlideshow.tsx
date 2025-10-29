"use client";

import { useState, useEffect, useLayoutEffect } from "react";
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
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousOpacity, setPreviousOpacity] = useState(1);
  const [currentOpacity, setCurrentOpacity] = useState(1);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  // Preload images and track when they're loaded
  useEffect(() => {
    imageUrls.forEach(url => {
      if (!loadedImages.has(url)) {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          setLoadedImages(prev => new Set(prev).add(url));
          cacheMarkImageLoaded(url);
        };
      }
    });
  }, [imageUrls, loadedImages]);

  // Handle fade transition
  useLayoutEffect(() => {
    if (isTransitioning) {
      setPreviousOpacity(1);
      setCurrentOpacity(0);
      const timer = setTimeout(() => {
        setPreviousOpacity(0);
        setCurrentOpacity(1);
      }, 0);
      const endTimer = setTimeout(() => setIsTransitioning(false), 500);
      return () => {
        clearTimeout(timer);
        clearTimeout(endTimer);
      };
    }
  }, [isTransitioning]);

  // Slide interval - change image with fade transition
  useEffect(() => {
    if (imageUrls.length <= 1) return;

    const interval = setInterval(() => {
      if (isTransitioning) return; // Prevent overlapping transitions
      const nextIndex = (currentIndex + 1) % imageUrls.length;
      const nextUrl = imageUrls[nextIndex];
      if (loadedImages.has(nextUrl) || cacheIsImageLoaded(nextUrl)) {
        setPreviousIndex(currentIndex);
        setCurrentIndex(nextIndex);
        setIsTransitioning(true);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [imageUrls.length, currentIndex, loadedImages, isTransitioning]);

  if (imageUrls.length === 0) return null;

  const currentUrl = imageUrls[currentIndex];
  const previousUrl = previousIndex !== null ? imageUrls[previousIndex] : null;
  const isCurrentLoaded = loadedImages.has(currentUrl) || cacheIsImageLoaded(currentUrl);
  const isPreviousLoaded = previousUrl && (loadedImages.has(previousUrl) || cacheIsImageLoaded(previousUrl));

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
      {/* Current image */}
      {allowLoad && isCurrentLoaded && (
        <img
          src={currentUrl}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: currentOpacity,
            transition: 'opacity 0.5s ease-in-out',
          }}
        />
      )}

      {/* Previous image (fading out) */}
      {allowLoad && isTransitioning && isPreviousLoaded && (
        <img
          src={previousUrl!}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: previousOpacity,
            transition: 'opacity 0.5s ease-in-out',
          }}
        />
      )}

      {/* Loading placeholder */}
      {!isCurrentLoaded && !isTransitioning && (
        <div style={{ width: '100%', height: '100%', background: 'var(--bg-elev)' }} aria-hidden />
      )}
    </div>
  );
}