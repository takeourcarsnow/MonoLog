"use client";

import { useState, useEffect } from "react";

interface MiniSlideshowProps {
  imageUrls: string[];
  size?: number;
  fill?: boolean;
}

export function MiniSlideshow({ imageUrls, size = 30, fill = false }: MiniSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (imageUrls.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % imageUrls.length);
    }, 8000); // Change every 8 seconds

    return () => clearInterval(interval);
  }, [imageUrls.length]);

  if (imageUrls.length === 0) return null;

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
      {imageUrls.map((url, index) => (
        <img
          key={url}
          src={url}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: index === currentIndex ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
          }}
        />
      ))}
    </div>
  );
}