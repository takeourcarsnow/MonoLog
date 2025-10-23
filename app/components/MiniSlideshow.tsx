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

  useEffect(() => {
    if (imageUrls.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % imageUrls.length);
    }, 8000); // Change every 8 seconds

    return () => clearInterval(interval);
  }, [imageUrls.length]);

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
      {/* Render only the current image to avoid mounting multiple images at once.
          This reduces concurrent network requests for tiny calendar thumbnails. */}
      {allowLoad && (isLoaded || allowLoad) ? (
        <OptimizedImage
          key={currentUrl}
          src={currentUrl}
          alt=""
          width={fill ? undefined : size}
          height={fill ? undefined : size}
          fill={fill}
          unoptimized={false}
          sizes={fill ? undefined : `${size}px`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: 1,
            transition: 'opacity 0.5s ease-in-out',
          }}
          placeholder={"empty"}
          loading={"lazy"}
          onLoad={() => { try { cacheMarkImageLoaded(currentUrl); } catch (e) {} }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'var(--bg-elev)' }} aria-hidden />
      )}
    </div>
  );
}