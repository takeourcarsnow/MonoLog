/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  threshold?: number;
  rootMargin?: string;
  placeholder?: string;
}

/**
 * LazyImage component with Intersection Observer for optimal loading
 * Only loads images when they're about to enter the viewport
 */
export function LazyImage({
  src,
  alt,
  threshold = 0.01,
  rootMargin = "200px",
  placeholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect fill='%23e5e7eb' width='400' height='400'/%3E%3C/svg%3E",
  className = "",
  ...props
}: LazyImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // Create intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isInView) {
            setIsInView(true);
            setCurrentSrc(src);
            observer.unobserve(img);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(img);

    return () => {
      if (img) {
        observer.unobserve(img);
      }
    };
  }, [src, threshold, rootMargin, isInView]);

  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      className={`lazy-image ${isLoaded ? 'loaded' : 'loading'} ${className}`}
      onLoad={() => {
        if (currentSrc === src) {
          setIsLoaded(true);
        }
      }}
      {...props}
    />
  );
}
