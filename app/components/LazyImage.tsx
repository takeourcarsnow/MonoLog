"use client";

import { useEffect, useRef, useState } from "react";
import { OptimizedImage } from "./OptimizedImage";

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  sizes?: string;
  rootMargin?: string;
  lazy?: boolean;
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  style,
  priority = false,
  sizes,
  rootMargin = "50px",
  lazy = true,
}: LazyImageProps) {
  const [isVisible, setIsVisible] = useState(priority || !lazy);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority || !lazy || isVisible) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isVisible, priority, lazy, rootMargin]);

  if (!lazy) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={{
          ...style,
          width: fill ? '100%' : width,
          height: fill ? '100%' : height,
          objectFit: fill ? 'cover' : 'contain',
          objectPosition: 'center center',
          borderRadius: 'inherit',
        }}
      />
    );
  }

  return (
    <div ref={ref} className={className} style={style}>
      {isVisible ? (
        <OptimizedImage
          src={src}
          alt={alt}
          width={width}
          height={height}
          fill={fill}
          sizes={sizes}
          loading="lazy"
          unoptimized={false}
          placeholder="blur"
          disableLoadingTransition={false}
        />
      ) : (
        <div
          style={{
            width: fill ? '100%' : width,
            height: fill ? '100%' : height,
            backgroundColor: 'var(--bg-elev)',
            borderRadius: 'inherit',
          }}
        />
      )}
    </div>
  );
}