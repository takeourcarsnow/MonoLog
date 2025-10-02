/* eslint-disable @next/next/no-img-element */
"use client";

import { memo, useState, useEffect, useRef } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  loading?: "lazy" | "eager";
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onDragStart?: (e: React.DragEvent<HTMLImageElement>) => void;
  className?: string;
  style?: React.CSSProperties;
}

// Memoized optimized image component with blur-up placeholder and intersection observer
const OptimizedImageComponent = ({
  src,
  alt,
  loading = "lazy",
  onLoad,
  onDragStart,
  className = "",
  style,
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === "eager");
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (loading === "eager" || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "50px", // Start loading slightly before image enters viewport
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [loading]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  return (
    <img
      ref={imgRef}
      src={isInView ? src : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"}
      alt={alt}
      loading={loading}
      onLoad={handleLoad}
      onDragStart={onDragStart}
      className={`${className} ${isLoaded ? "loaded" : ""}`}
      style={{
        ...style,
        opacity: isLoaded ? 1 : 0.8,
        transition: "opacity 0.3s ease-in-out",
      }}
      decoding="async"
    />
  );
};

// Export memoized version
export const OptimizedImage = memo(OptimizedImageComponent);
